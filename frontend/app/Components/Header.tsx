import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  TextInput, StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from '../../types/AppStack';

type HeaderNavProp = StackNavigationProp<AppStackParamList>;

interface AppHeaderProps {
  title: string;
  onSearch?: (text: string) => void;
  onOpenCamera?: () => void;
  rightExtras?: React.ReactNode;
  showBack?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onSearch,
  onOpenCamera,
  rightExtras,
  showBack = true,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HeaderNavProp>();
  const [search, setSearch] = useState('');

  const theme = {
    background: '#001F3F',
    textPrimary: '#FAFAFA',
    textSecondary: '#A0A0A0',
    inputBorder: '#ffffff22',
    secondary: '#FBC02D',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.inputBorder }]}>
        <View style={styles.topRow}>
          {showBack && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          )}

          <Image
            source={require('../../assets/Logo.png')}
            style={[styles.avatar, { backgroundColor: theme.secondary }]}
          />

          <View style={styles.titleTextContainer}>
            <Text style={[styles.titleText, { color: theme.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.rightActions}>
            {onOpenCamera && (
              <TouchableOpacity onPress={onOpenCamera} style={styles.iconBtn}>
                <Ionicons name="camera" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            )}
            {rightExtras}
          </View>
        </View>

        {onSearch && (
          <View style={[styles.searchRow, { backgroundColor: theme.inputBorder, borderRadius: 50 }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} />
            <TextInput
              placeholder="Search..."
              value={search}
              onChangeText={(text) => { setSearch(text); onSearch(text); }}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#001F3F',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  titleTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  iconBtn: {
    padding: 4,
  },
  searchRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },
});

export default AppHeader;
