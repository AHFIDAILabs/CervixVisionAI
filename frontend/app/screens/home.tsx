// app/home.tsx
import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  Linking,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import AppHeader from "../Components/Header";
import { useAuth } from "../../Context/AuthContext";
import { AuthStackParamList } from "../../types/auth";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

type HomeNavigationProps = NativeStackNavigationProp<AuthStackParamList, "home">;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProps>();
  const { user } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get("window");

  const galleryImages = [
    require("../../assets/analyzer_1.jpeg"),
    require("../../assets/analyzer_2.jpeg"),
    require("../../assets/analyzer_3.jpeg"),
  ];

  const partners = [
    {
      id: 1,
      name: "Global Health Innovation Hub",
      address: "Digital Health District, NY",
      logo: require("../../assets/Hub.png"),
      website: "https://example.com",
    },
    {
      id: 2,
      name: "Maternal Wellness Institute",
      address: "45 Community Care Avenue, LA",
      logo: require("../../assets/Hub.png"),
      website: "https://example.com",
    },
    {
      id: 3,
      name: "African Women’s Health Lab",
      address: "8 Public Health Road, Nairobi",
      logo: require("../../assets/Hub_2.jpeg"),
      website: "https://example.com",
    },
  ];

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn("Can't open url:", url, err);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        type="feed"
        title="AcetowhiteVision AI"
        avatar={{ uri: user?.userImage || undefined }}
        showBack={false}
      />

      <Animated.ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <AnimatedImageBackground
          source={require("../../assets/heart.jpeg")}
          style={{
            ...styles.hero,
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 200],
                  outputRange: [0, -50],
                  extrapolate: "clamp",
                }),
              },
              {
                scale: scrollY.interpolate({
                  inputRange: [-200, 0],
                  outputRange: [1.2, 1],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          <View style={styles.heroOverlay} />
          <Animated.Text
            style={{
              ...styles.heroTitle,
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 200],
                    outputRange: [0, -30],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          >
            Cervical Vision AI
          </Animated.Text>

          <Text style={styles.heroSubtitle}>
            AI-powered cervical cancer screening tool for instant, specialist-level results anywhere.
          </Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => navigation.navigate("RegisterScreen" as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaPrimaryText}>Start Screening</Text>
              <LottieView
                source={require("../../assets/Logo.png")}
                autoPlay
                loop
                style={{
                  position: "absolute",
                  width: 100,
                  height: 100,
                  opacity: 0.4,
                  top: -20,
                  left: -20,
                }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaGhost}
              onPress={() => navigation.navigate("LoginScreen" as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaGhostText}>Clinical Login</Text>
            </TouchableOpacity>
          </View>
        </AnimatedImageBackground>

        {/* About Us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Cervical Vision AI</Text>
          <Text style={styles.sectionText}>
          Cervical Vision AI is a smartphone-based cervical cancer screening tool designed to bring rapid, reliable screening to the point of care.
 
          Using artificial intelligence, the app analyses images of the cervix directly on the device in less than three seconds, even without an internet connection. By providing an immediate positive or negative result, it supports nurses, midwives, and community health workers in identifying women who may need further evaluation and treatment at an early stage, particularly in underserved communities.
          </Text>
        </View>

        {/* Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gallery}
            contentContainerStyle={{ paddingRight: 18 }}
          >
            {galleryImages.map((img, i) => {
              const scale = new Animated.Value(1);
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.9}
                  onPressIn={() =>
                    Animated.spring(scale, { toValue: 1.05, useNativeDriver: true }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
                  }
                >
                  <Animated.Image
                    source={img}
                    style={[styles.galleryImage, { transform: [{ scale }] }]}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Partners */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Partners</Text>
          {partners.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.partnerCard}
              onPress={() => openLink(p.website)}
              activeOpacity={0.85}
            >
              <Image source={p.logo} style={styles.partnerLogo} />
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerName}>{p.name}</Text>
                <Text style={styles.partnerAddress}>{p.address}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.copy}>© {new Date().getFullYear()} CervicalVision AI</Text>
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => openLink("https://example.com/terms")}>
              <Text style={styles.linkText}>Terms</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openLink("https://example.com/privacy")}>
              <Text style={styles.linkText}>Privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openLink("mailto:support@avehealth.ai")}>
              <Text style={styles.linkText}>Contact</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.socials}>
            {["facebook", "twitter", "linkedin", "instagram"].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => openLink(`https://${s}.com`)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={`logo-${s}` as any}
                  size={22}
                  color={
                    s === "facebook"
                      ? "#1877F2"
                      : s === "twitter"
                      ? "#1DA1F2"
                      : s === "linkedin"
                      ? "#0077B5"
                      : "#C13584"
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  contentContainer: { paddingBottom: 40 },
  hero: {
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  heroTitle: { color: "#fff", fontSize: 34, fontWeight: "800", zIndex: 2 },
  heroSubtitle: {
    color: "#e6eefc",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 24,
    fontSize: 15,
    zIndex: 2,
  },
  ctaRow: { flexDirection: "row", marginTop: 18, zIndex: 2 },
  ctaPrimary: {
    backgroundColor: "#0EA5A4",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
  },
  ctaPrimaryText: { color: "#fff", fontWeight: "700" },
  ctaGhost: {
    borderWidth: 1,
    borderColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  ctaGhostText: { color: "#fff", fontWeight: "600" },
  section: { paddingHorizontal: 20, paddingVertical: 18 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  sectionText: { fontSize: 15, lineHeight: 22, color: "#374151" },
  gallery: { paddingLeft: 20, marginTop: 6 },
  galleryImage: {
    width: 220,
    height: 140,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#ddd",
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  partnerLogo: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  partnerName: { fontSize: 16, fontWeight: "700" },
  partnerAddress: { color: "#6b7280", marginTop: 3 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  copy: { color: "#6b7280", marginBottom: 8 },
  linksRow: { flexDirection: "row", gap: 18, marginBottom: 12 },
  linkText: { color: "#2563EB", marginHorizontal: 8 },
  socials: { flexDirection: "row", justifyContent: "space-between", width: 180 },
});
