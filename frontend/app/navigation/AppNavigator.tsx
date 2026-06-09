import React from "react";
import { useCentre } from "../../Context/CentreContext";
import AppStack from "./AppStack";
import CentreStack from "./CentreStack";

export default function AppNavigator() {
  const { centre, loading } = useCentre();

  if (loading) return null; // splash screen could go here

  return centre ? <AppStack /> : <CentreStack />;
}
