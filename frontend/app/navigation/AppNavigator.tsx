import React, { useEffect, useState } from "react";
import { useCentre } from "../../Context/CentreContext";
import AppStack from "./AppStack";
import CentreStack from "./CentreStack";
import ModelDownloadScreen from "../screens/ModelDownloadScreen";
import { areModelsDownloaded } from "../../utils/modelManager";

export default function AppNavigator() {
  const { centre, loading } = useCentre();
  const [modelsReady, setModelsReady] = useState<boolean | null>(null);

  useEffect(() => {
    areModelsDownloaded().then(setModelsReady);
  }, []);

  if (loading || modelsReady === null) return null; // splash screen could go here

  if (!modelsReady) {
    return <ModelDownloadScreen onComplete={() => setModelsReady(true)} />;
  }

  return centre ? <AppStack /> : <CentreStack />;
}
