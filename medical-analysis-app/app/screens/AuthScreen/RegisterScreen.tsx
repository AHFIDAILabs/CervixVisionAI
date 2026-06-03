import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Toast from "react-native-toast-message";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useAuth } from "../../../Context/AuthContext";
import { RegisterPayload } from "../../../types/auth";
import { registerUser } from "../../../Services/authService";

type GenderLiteral = "male" | "female" | "other";

type AddressDetail = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type FullRegisterForm = Omit<
  RegisterPayload,
  | "gender"
  | "role"
  | "address"
  | "phone"
  | "specialization"
  | "licenseNumber"
  | "hospitalAffiliation"
  | "dateOfBirth"
> & {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  cPassword: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  hospitalAffiliation: string;
  dateOfBirth: string;
  gender: GenderLiteral | "";
  role: string;
  address: AddressDetail;
};

const roles: string[] = ["patient", "doctor", "lab_technician", "admin"];
const placeholderColor = "#9CA3AF";

export default function RegisterScreen() {
  const { handleSuccessfulAuth } = useAuth();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [form, setForm] = useState<FullRegisterForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    cPassword: "",
    role: "",
    phone: "",
    address: { street: "", city: "", state: "", zip: "", country: "" },
    specialization: "",
    licenseNumber: "",
    hospitalAffiliation: "",
    dateOfBirth: "",
    gender: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof FullRegisterForm, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAddressChange = (key: keyof AddressDetail, value: string) =>
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [key]: value },
    }));

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === "android") setShowDatePicker(false);
    setDate(currentDate);
    handleChange("dateOfBirth", currentDate.toISOString().split("T")[0]);
  };

  const handleRegister = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      Toast.show({
        type: "info",
        text1: "Missing Field",
        text2: "Please fill all required fields.",
      });
      return;
    }

    if (!form.role) {
      Toast.show({
        type: "info",
        text1: "Role Required",
        text2: "Please select your role.",
      });
      return;
    }

    if (form.role === "doctor" && (!form.specialization || !form.licenseNumber)) {
      Toast.show({
        type: "error",
        text1: "Doctor Fields Missing",
        text2: "Specialization and License Number are required.",
      });
      return;
    }


    try {
      setLoading(true);
      const payload: RegisterPayload = {
        ...form,
        role: form.role as RegisterPayload["role"],
        gender: form.gender || undefined,
        address: [form.address],
      };
      const res = await registerUser(payload);
      await handleSuccessfulAuth(res);

      Toast.show({
        type: "success",
        text1: "Registration Successful!",
        text2: "You are now logged in.",
      });
    } catch (error: any) {
      console.error("Registration Error:", error);
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2:
          error.response?.data?.message ||
          error.message ||
          "Network error.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
      <Image
        source={require("../../../assets/Logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Create an Account ✨</Text>

      {/* Inputs */}
      <TextInput
        placeholder="First Name"
        value={form.firstName}
        onChangeText={(v) => handleChange("firstName", v)}
        style={styles.input}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        placeholder="Last Name"
        value={form.lastName}
        onChangeText={(v) => handleChange("lastName", v)}
        style={styles.input}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        placeholder="Email"
        value={form.email}
        onChangeText={(v) => handleChange("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        placeholder="Password"
        value={form.password}
        onChangeText={(v) => handleChange("password", v)}
        secureTextEntry
        style={styles.input}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        placeholder="Confirm Password"
        value={form.cPassword}
        onChangeText={(v) => handleChange("cPassword", v)}
        secureTextEntry
        style={styles.input}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        placeholder="Phone"
        value={form.phone}
        onChangeText={(v) => handleChange("phone", v)}
        keyboardType="phone-pad"
        style={styles.input}
        placeholderTextColor={placeholderColor}
      />

      {/* Address Section — optional, can be completed from Profile */}
      <View style={styles.addressGroup}>
        <View style={styles.addressHeaderRow}>
          <Text style={styles.addressHeader}>Address Details</Text>
          <Text style={styles.optionalBadge}>Optional</Text>
        </View>
        <TextInput
          placeholder="Street Address"
          value={form.address.street}
          onChangeText={(v) => handleAddressChange("street", v)}
          style={styles.input}
          placeholderTextColor={placeholderColor}
        />
        <TextInput
          placeholder="City"
          value={form.address.city}
          onChangeText={(v) => handleAddressChange("city", v)}
          style={styles.input}
          placeholderTextColor={placeholderColor}
        />
        <View style={styles.row}>
          <TextInput
            placeholder="State"
            value={form.address.state}
            onChangeText={(v) => handleAddressChange("state", v)}
            style={[styles.input, styles.halfInput]}
            placeholderTextColor={placeholderColor}
          />
          <TextInput
            placeholder="Zip"
            value={form.address.zip}
            onChangeText={(v) => handleAddressChange("zip", v)}
            keyboardType="number-pad"
            style={[styles.input, styles.halfInput]}
            placeholderTextColor={placeholderColor}
          />
        </View>
        <TextInput
          placeholder="Country"
          value={form.address.country}
          onChangeText={(v) => handleAddressChange("country", v)}
          style={styles.input}
          placeholderTextColor={placeholderColor}
        />
      </View>

      {/* Role Picker */}
      <View style={styles.pickerBox}>
        <Picker
          style={styles.picker}
          dropdownIconColor="#000"
          selectedValue={form.role}
          onValueChange={(v) => handleChange("role", v as string)}
        >
          <Picker.Item label="Select your role" value="" color={placeholderColor} />
          {roles.map((r) => (
            <Picker.Item
              key={r}
              label={r.replace("_", " ").toUpperCase()}
              value={r}
            />
          ))}
        </Picker>
      </View>

      {/* Role-specific fields */}
      {form.role === "doctor" && (
        <View style={styles.roleFields}>
          <Text style={styles.roleHeader}>Doctor Details</Text>
          <TextInput
            placeholder="Specialization"
            value={form.specialization}
            onChangeText={(v) => handleChange("specialization", v)}
            style={styles.input}
            placeholderTextColor={placeholderColor}
          />
          <TextInput
            placeholder="License Number"
            value={form.licenseNumber}
            onChangeText={(v) => handleChange("licenseNumber", v)}
            style={styles.input}
            placeholderTextColor={placeholderColor}
          />
          <TextInput
            placeholder="Hospital Affiliation"
            value={form.hospitalAffiliation}
            onChangeText={(v) => handleChange("hospitalAffiliation", v)}
            style={styles.input}
            placeholderTextColor={placeholderColor}
          />
        </View>
      )}

      {form.role === "patient" && (
        <View style={styles.roleFields}>
          <Text style={styles.roleHeader}>Patient Details (Optional)</Text>
          <View style={styles.pickerBox}>
            <Picker
              style={styles.picker}
              dropdownIconColor="#000"
              selectedValue={form.gender}
              onValueChange={(v) => handleChange("gender", v as GenderLiteral | "")}
            >
              <Picker.Item label="Select gender" value="" color={placeholderColor} />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text
              style={form.dateOfBirth ? styles.dateText : styles.datePlaceholder}
            >
              {form.dateOfBirth || "Select Date of Birth"}
            </Text>
          </TouchableOpacity>

          {(showDatePicker || Platform.OS === "ios") && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>
      )}

      <TouchableOpacity
        disabled={loading}
        onPress={handleRegister}
        style={styles.registerButton}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { backgroundColor: "#fff" },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 10 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#fff",
    height: 50,
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  picker: {
    color: "#000",
    width: "100%",
    height: "100%",
  },
  roleFields: {
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FEE5A2",
    borderRadius: 12,
    backgroundColor: "#FFFBEA",
  },
  roleHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#D97706",
    textAlign: "center",
  },
  addressGroup: {
    marginBottom: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  addressHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  optionalBadge: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { width: "48%" },
  dateInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    height: 50,
    justifyContent: "center",
    marginBottom: 16,
  },
  dateText: { color: "#000" },
  datePlaceholder: { color: "#999" },
  registerButton: { backgroundColor: "#10B981", borderRadius: 12, padding: 15 },
  buttonText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
