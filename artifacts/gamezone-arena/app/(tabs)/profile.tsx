import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useAuth,
  useUser,
} from '@clerk/expo';

import {
  useRouter, type Href
} from 'expo-router';
import { useDeleteUserData, useSupabaseAuth } from '@/hooks/useBusiness';
import { Alert } from 'react-native';
import { Feather } from '@/components/Feather';

export default function ProfileScreen() {
  const router = useRouter();

  const { signOut } = useAuth();
  const { user } = useUser();
  const deleteUserData = useDeleteUserData();
  useSupabaseAuth();

  const [loggingOut, setLoggingOut] =
    useState(false);

  async function logout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      // Clerk session logout
      await signOut();

      // Logout के बाद सीधे Sign In
      router.replace('/sign-in');
    } catch (error) {
      console.error(
        'Logout error:',
        error,
      );

      setLoggingOut(false);
    }
  }

  const name =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    'PLAYER';

  const email =
    user?.primaryEmailAddress
      ?.emailAddress ||
    'No email';

  async function handleDeleteAccount() {
    if (loggingOut) return;
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account, your game progress, and your business listings? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              // Clean up backend data via RPC
              await deleteUserData.mutateAsync();
              // Delete Clerk user
              await user?.delete();
              // Will automatically route away or we can push
              router.replace('/(auth)/sign-in' as Href);
            } catch (err: any) {
              setLoggingOut(false);
              Alert.alert('Error', err.message || 'Failed to delete account');
            }
          }
        }
      ]
    );
  }

  return (
    <View style={styles.container}>

      {/* BACK */}
      <Pressable
        onPress={() => router.back()}
        disabled={loggingOut}
        style={styles.back}
      >
        <Text style={styles.backText}>
          ← BACK
        </Text>
      </Pressable>

      {/* TITLE */}
      <Text style={styles.title}>
        PLAYER PROFILE
      </Text>

      {/* PROFILE CARD */}
      <View style={styles.card}>

        <Text style={styles.label}>
          NAME
        </Text>

        <Text style={styles.value}>
          {name}
        </Text>

        <Text style={styles.label}>
          EMAIL
        </Text>

        <Text style={styles.value}>
          {email}
        </Text>

        <Text style={styles.label}>
          CLERK USER ID
        </Text>

        <Text
          style={styles.id}
          selectable
        >
          {user?.id || 'No user ID'}
        </Text>

      </View>

      <View style={styles.menuLinks}>
        <Pressable style={styles.menuLink} onPress={() => router.push('/business/mine' as Href)}>
          <Feather name="briefcase" size={18} color="#FFFFFF" />
          <Text style={styles.menuLinkText}>My Business Listings</Text>
          <Feather name="chevron-right" size={18} color="#71809F" />
        </Pressable>

        <Pressable style={styles.menuLink} onPress={() => router.push('/business/saved' as Href)}>
          <Feather name="bookmark" size={18} color="#FFFFFF" />
          <Text style={styles.menuLinkText}>Saved Businesses</Text>
          <Feather name="chevron-right" size={18} color="#71809F" />
        </Pressable>

        <Pressable style={styles.menuLink} onPress={() => router.push('/business/legal' as Href)}>
          <Feather name="shield" size={18} color="#FFFFFF" />
          <Text style={styles.menuLinkText}>Legal & Privacy</Text>
          <Feather name="chevron-right" size={18} color="#71809F" />
        </Pressable>

        <Pressable style={styles.menuLink} onPress={() => router.push('/business/admin' as Href)}>
          <Feather name="shield" size={18} color="#FFFFFF" />
          <Text style={styles.menuLinkText}>Moderation Queue</Text>
          <Feather name="chevron-right" size={18} color="#71809F" />
        </Pressable>
      </View>

      {/* ACTIONS */}
      <View style={styles.actionsContainer}>
        <Pressable
          onPress={handleDeleteAccount}
          disabled={loggingOut}
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteBtnText}>DELETE ACCOUNT</Text>
        </Pressable>

        <Pressable
          onPress={logout}
          disabled={loggingOut}
          style={[
            styles.logout,
            loggingOut &&
              styles.logoutDisabled,
          ]}
        >
          {loggingOut ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.logoutText}>
              LOG OUT
            </Text>
          )}
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A17',
    padding: 22,
  },

  back: {
    marginTop: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },

  backText: {
    color: '#43DDF8',
    fontWeight: '900',
    fontSize: 14,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 28,
  },

  card: {
    backgroundColor: '#111C34',
    borderWidth: 1,
    borderColor: '#304162',
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
  },

  label: {
    color: '#71809F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 12,
  },

  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },

  id: {
    color: '#43DDF8',
    fontSize: 11,
    marginTop: 5,
  },

  menuLinks: {
    marginTop: 20,
    backgroundColor: '#111C34',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#304162',
    overflow: 'hidden',
  },

  menuLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#304162',
  },

  menuLinkText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
  },

  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  deleteBtn: {
    flex: 1,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EF334020',
    borderWidth: 1,
    borderColor: '#EF3340',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteBtnText: {
    color: '#EF3340',
    fontSize: 13,
    fontWeight: '900',
  },

  logout: {
    flex: 1,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EF3340',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutDisabled: {
    opacity: 0.55,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});