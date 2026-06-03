import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../Context/AuthContext';
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from '../../types/AppStack';
import { AuthStackParamList } from '../../types/auth';

type headerNavigateProp = CompositeNavigationProp<StackNavigationProp<AppStackParamList>,
StackNavigationProp<AuthStackParamList>
>


type ChatType = 'private' | 'unit' | 'department' | 'general' | 'feed';

interface AppHeaderProps {
  type: ChatType;
  title: string;
  onTitlePress?: () => void;
  avatar?: { uri?: string; cld_id?: string; url?: string };
  recipientId?: string;
  onSearch?: (text: string) => void;
  onOpenCamera?: () => void;
  onSelectChatType?: () => void;
  rightExtras?: React.ReactNode;
  showBack?: boolean;
  onAvatarError?: (e: { nativeEvent: { error: any } }) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  type,
  title,
  avatar,
  onTitlePress,
  recipientId,
  onSearch,
  onOpenCamera,
  onSelectChatType,
  rightExtras,
  showBack = true,
  onAvatarError,
}) => {
  const { user, accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');

  const navigation = useNavigation<headerNavigateProp>()

  // Simple theme for consistency with BottomNavigationBar
  const theme = {
    background: '#001F3F',
    textPrimary: '#FAFAFA',
    textSecondary: '#A0A0A0',
    inputBorder: '#ffffff22',
    secondary: '#FBC02D',
    fontFamily: {
      regular: 'System',
      bold: 'System',
    },
    fontSize: {
      large: 18,
    },
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    onSearch?.(text);
  };

  const displayTitle =
    title ||
    (type === 'feed'
      ? 'Medical Community'
      : `${type[0].toUpperCase()}${type.slice(1)} Chat`);

  const showRecipientProfileLink = type === 'private' && recipientId && user && accessToken;

  const handleAvatarPress = () => {
    if (showRecipientProfileLink && recipientId) {
      console.log(`[AppHeader] Navigating to UserProfile with userId: ${recipientId}`);
      router.push({ pathname: '/UserProfile', params: { userId: recipientId } });
    }
  };

  const handleTitleTextPress = () => {
    if (type === 'private' && recipientId && user && accessToken) {
      console.log(`[AppHeader] Navigating to UserProfile with userId: ${recipientId}`);
      router.push({ pathname: '/UserProfile', params: { userId: recipientId } });
    }
    onTitlePress?.();
  };

const handleBackPress = () => {
  if (user && accessToken) {
    navigation.goBack(); // ✅ safe with react-navigation
  } else {
    console.warn('[AppHeader] Back navigation blocked: missing user or token');
    navigation.navigate("LoginScreen"); // ✅ go to your AuthStack login
  }
};

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.inputBorder }]}>
        <View style={styles.topRow}>
          {showBack && (
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          )}

          {avatar?.uri ? (
            <TouchableOpacity
              onPress={handleAvatarPress}
              style={styles.avatarTouchable}
              disabled={!showRecipientProfileLink}
            >
              <Image
                source={{ uri: avatar.uri }}
                style={[styles.avatar, { backgroundColor: theme.secondary }]}
                onError={onAvatarError}
              />
            </TouchableOpacity>
          ) : (
            <Image
              source={require('../../assets/Logo.png')}
              style={[styles.avatar, { backgroundColor: theme.secondary }]}
              onError={(e) => console.log('Placeholder image error:', e.nativeEvent.error)}
            />
          )}

          <TouchableOpacity
            onPress={handleTitleTextPress}
            style={styles.titleTextContainer}
          >
            <Text
              style={[
                styles.titleText,
                {
                  color: theme.textPrimary,
                  fontFamily: theme.fontFamily.bold,
                  fontSize: theme.fontSize.large,
                },
              ]}
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            {onOpenCamera && (
              <TouchableOpacity onPress={onOpenCamera} style={styles.iconBtn}>
                <Ionicons name="camera" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            )}
            {onSelectChatType && (
              <TouchableOpacity onPress={onSelectChatType} style={styles.iconBtn}>
                <Ionicons name="people" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            )}
            {rightExtras}
          </View>
        </View>

        {onSearch && (
          <View style={[styles.searchRow, { backgroundColor: theme.inputBorder, borderRadius: 50 }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} />
            <TextInput
              placeholder="Search in chat..."
              value={search}
              onChangeText={handleSearchChange}
              style={[styles.searchInput, { color: theme.textPrimary, fontFamily: theme.fontFamily.regular }]}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    gap: 20,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  avatarTouchable: {
    marginRight: 8,
    padding: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  titleTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
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