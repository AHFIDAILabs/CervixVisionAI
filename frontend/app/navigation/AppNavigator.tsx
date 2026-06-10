import React from "react";
import { useCentre } from "../../Context/CentreContext";
import AppStack from "./AppStack";
import CentreStack from "./CentreStack";

// NOTE: model-download gating temporarily disabled as part of an isolation
// test for the onnxruntime-react-native crash — see utils/onDeviceInference.ts
export default function AppNavigator() {
  const { centre, loading } = useCentre();

  if (loading) return null; // splash screen could go here

  return centre ? <AppStack /> : <CentreStack />;
}
