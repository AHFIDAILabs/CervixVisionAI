import json
import timm
import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from tqdm import tqdm
import matplotlib.pyplot as plt

from cervix_visionai.entity.config_entity import TrainingConfig
from cervix_visionai.utils.logger import logger


class EnsembleTrainer:
    """
    Trains the two ensemble members (Swin Transformer + EfficientNet-B3)
    independently using the same SSL + high-sensitivity fine-tuning strategy,
    then saves each to its own model path.
    """

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.consistency_weight = 1.0
        self.pseudo_label_threshold = 0.8
        self.hs_learning_rate = 0.0001
        self.hs_epochs = 10

    def _get_dataloaders(self):
        data_dir = Path(self.config.training_data)
        labeled_path = data_dir / "labeled"
        unlabeled_path = data_dir / "Unlabeled"

        if not labeled_path.exists():
            logger.info("Organising data into labeled/unlabeled...")
            labeled_path.mkdir(exist_ok=True)
            for cls in ["Positive", "Negative"]:
                src, dst = data_dir / cls, labeled_path / cls
                if src.exists() and not dst.exists():
                    src.rename(dst)
            unlabeled_src = data_dir / "Unlabeled"
            if unlabeled_src.exists() and not unlabeled_path.exists():
                unlabeled_src.rename(unlabeled_path)

        img_size = self.config.params_image_size[:-1]
        mean, std = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]

        labeled_tf = transforms.Compose([
            transforms.Resize(img_size),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ToTensor(),
            transforms.Normalize(mean, std),
        ])
        unlabeled_tf = transforms.Compose([
            transforms.Resize(img_size),
            transforms.ToTensor(),
            transforms.Normalize(mean, std),
        ])

        labeled_ds = datasets.ImageFolder(root=labeled_path, transform=labeled_tf)
        unlabeled_ds = (
            datasets.ImageFolder(root=unlabeled_path, transform=unlabeled_tf)
            if unlabeled_path.exists() else None
        )

        train_size = int(0.8 * len(labeled_ds))
        val_size = len(labeled_ds) - train_size
        train_ds, val_ds = torch.utils.data.random_split(labeled_ds, [train_size, val_size])

        self.train_loader = DataLoader(train_ds, batch_size=self.config.params_batch_size, shuffle=True)
        self.val_loader = DataLoader(val_ds, batch_size=self.config.params_batch_size, shuffle=False)
        self.unlabeled_loader = (
            DataLoader(unlabeled_ds, batch_size=self.config.params_batch_size, shuffle=True)
            if unlabeled_ds else None
        )
        logger.info(f"Labeled: {len(labeled_ds)}  Unlabeled: {len(unlabeled_ds) if unlabeled_ds else 0}")

    def _load_model(self, model_name: str, base_path: Path) -> torch.nn.Module:
        logger.info(f"Loading {model_name} from {base_path}")
        model = timm.create_model(model_name, pretrained=False, num_classes=self.config.params_classes)
        model.load_state_dict(torch.load(base_path, map_location=self.device))
        return model.to(self.device)

    def _train_one_model(
        self,
        model: torch.nn.Module,
        model_name: str,
        save_path: Path,
    ):
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=self.config.params_learning_rate)
        history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

        for epoch in range(self.config.params_epochs):
            model.train()
            total_loss, correct, total = 0.0, 0, 0
            pbar = tqdm(self.train_loader, desc=f"[{model_name}] Epoch {epoch+1}/{self.config.params_epochs}")
            for inputs, labels in pbar:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                total_loss += loss.item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (preds == labels).sum().item()
                pbar.set_postfix({"loss": f"{total_loss/total:.4f}", "acc": f"{correct/total:.4f}"})

            train_loss, train_acc = total_loss / total, correct / total

            if self.unlabeled_loader:
                self._ssl_step(model, optimizer, criterion)

            val_loss, val_acc = self._validate(model, criterion)
            history["train_loss"].append(train_loss)
            history["train_acc"].append(train_acc)
            history["val_loss"].append(val_loss)
            history["val_acc"].append(val_acc)
            logger.info(
                f"[{model_name}] Epoch {epoch+1}: "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
                f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
            )

        self._save_results(history, tag=model_name.replace("/", "_"))
        self._hs_finetune(model, model_name, criterion)
        torch.save(model.state_dict(), save_path)
        logger.info(f"[{model_name}] Saved to {save_path}")

    def _ssl_step(self, model, optimizer, criterion):
        model.train()
        for inputs, _ in tqdm(self.unlabeled_loader, desc="SSL pseudo-label step"):
            inputs = inputs.to(self.device)
            with torch.no_grad():
                probs = torch.softmax(model(inputs), dim=1)
                conf, pseudo_labels = torch.max(probs, dim=1)
                mask = conf > self.pseudo_label_threshold
            if mask.sum() == 0:
                continue
            outputs = model(inputs[mask])
            ssl_loss = criterion(outputs, pseudo_labels[mask]) * self.consistency_weight
            optimizer.zero_grad()
            ssl_loss.backward()
            optimizer.step()

    def _hs_finetune(self, model, model_name, criterion):
        logger.info(f"[{model_name}] High-sensitivity fine-tuning...")
        optimizer = optim.Adam(model.parameters(), lr=self.hs_learning_rate)
        for epoch in range(self.hs_epochs):
            model.train()
            total_loss, correct, total = 0.0, 0, 0
            for inputs, labels in tqdm(self.train_loader, desc=f"HS {epoch+1}/{self.hs_epochs}"):
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                optimizer.zero_grad()
                outputs = model(inputs)
                weights = torch.ones_like(labels, dtype=torch.float32, device=self.device)
                weights[labels == 1] = 2.0
                loss = (nn.functional.cross_entropy(outputs, labels, reduction="none") * weights).mean()
                loss.backward()
                optimizer.step()
                total_loss += loss.item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (preds == labels).sum().item()
            logger.info(f"[{model_name}] HS Epoch {epoch+1}: loss={total_loss/total:.4f} acc={correct/total:.4f}")

    def _validate(self, model, criterion):
        model.eval()
        val_loss, correct, total = 0.0, 0, 0
        with torch.no_grad():
            for inputs, labels in self.val_loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                outputs = model(inputs)
                val_loss += criterion(outputs, labels).item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (preds == labels).sum().item()
        return val_loss / total, correct / total

    def _save_results(self, history: dict, tag: str):
        out_dir = Path(self.config.root_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        with open(out_dir / f"{tag}_history.json", "w") as f:
            json.dump(history, f, indent=4)
        plt.figure(figsize=(12, 5))
        plt.subplot(1, 2, 1)
        plt.plot(history["train_acc"], label="Train")
        plt.plot(history["val_acc"], label="Val")
        plt.legend(); plt.title(f"Accuracy — {tag}")
        plt.subplot(1, 2, 2)
        plt.plot(history["train_loss"], label="Train")
        plt.plot(history["val_loss"], label="Val")
        plt.legend(); plt.title(f"Loss — {tag}")
        plt.savefig(out_dir / f"{tag}_curves.png")
        plt.close()

    def train(self):
        self._get_dataloaders()
        primary = self._load_model(
            self.config.params_primary_model_name,
            self.config.primary_base_model_path,
        )
        secondary = self._load_model(
            self.config.params_secondary_model_name,
            self.config.secondary_base_model_path,
        )
        self._train_one_model(primary, self.config.params_primary_model_name, self.config.primary_trained_model_path)
        self._train_one_model(secondary, self.config.params_secondary_model_name, self.config.secondary_trained_model_path)
        logger.info("Ensemble training complete. Both models saved.")
