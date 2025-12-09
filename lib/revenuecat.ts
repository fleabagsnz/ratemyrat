import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { supabase } from './supabase';

const BLOOD_RED_ENTITLEMENT = 'blood_red';
const BLOOD_RED_PRODUCT_ID = 'ratblood_red';

const isNativeStoreSupported = Platform.OS === 'ios' || Platform.OS === 'android';
let isConfigured = false;
let configuredUserId: string | null = null;

const getApiKeyForPlatform = () => {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  return undefined;
};

type EnsureResult =
  | { ok: true }
  | { ok: false; reason: 'missing_api_key' | 'unsupported_platform' };

const updateEntitlementsInProfile = async (
  profileId: string,
  hasBloodRed: boolean,
  currentEntitlements?: Record<string, boolean> | null
) => {
  const mergedEntitlements = {
    ...(currentEntitlements ?? {}),
    [BLOOD_RED_ENTITLEMENT]: hasBloodRed,
  };

  const { error } = await supabase
    .from('profiles')
    .update({ entitlements: mergedEntitlements })
    .eq('id', profileId);

  if (error) {
    throw error;
  }

  return mergedEntitlements;
};

export const ensureRevenueCatConfigured = async (
  profileId?: string | null
): Promise<EnsureResult> => {
  if (!isNativeStoreSupported) {
    return { ok: false, reason: 'unsupported_platform' };
  }

  const apiKey = getApiKeyForPlatform();
  if (!apiKey) {
    return { ok: false, reason: 'missing_api_key' };
  }

  // Configure once, then rely on logIn/logOut for user changes
  if (!isConfigured) {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    await Purchases.configure({
      apiKey,
      appUserID: profileId ?? undefined,
    });
    isConfigured = true;
    configuredUserId = profileId ?? null;
    return { ok: true };
  }

  if (configuredUserId !== (profileId ?? null)) {
    if (profileId) {
      await Purchases.logIn(profileId);
      configuredUserId = profileId;
    } else {
      await Purchases.logOut();
      configuredUserId = null;
    }
  }

  return { ok: true };
};

export const syncEntitlementsFromRevenueCat = async (params: {
  profileId: string;
  currentEntitlements?: Record<string, boolean> | null;
}) => {
  const { profileId, currentEntitlements } = params;
  const ensureResult = await ensureRevenueCatConfigured(profileId);

  if (!ensureResult.ok) {
    throw new Error(
      ensureResult.reason === 'missing_api_key'
        ? 'RevenueCat API key is missing. Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS (and ANDROID if needed).'
        : 'RevenueCat is only supported on device builds.'
    );
  }

  const customerInfo = await Purchases.getCustomerInfo();
  const hasBloodRed = Boolean(
    customerInfo.entitlements.active[BLOOD_RED_ENTITLEMENT] ||
      customerInfo.allPurchasedProductIdentifiers?.includes(BLOOD_RED_PRODUCT_ID)
  );

  const entitlements = await updateEntitlementsInProfile(
    profileId,
    hasBloodRed,
    currentEntitlements
  );

  return { customerInfo, hasBloodRed, entitlements };
};

export const purchaseBloodRed = async (params: {
  profileId: string;
  currentEntitlements?: Record<string, boolean> | null;
}) => {
  const { profileId, currentEntitlements } = params;
  const ensureResult = await ensureRevenueCatConfigured(profileId);

  if (!ensureResult.ok) {
    throw new Error(
      ensureResult.reason === 'missing_api_key'
        ? 'RevenueCat API key is missing. Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS (and ANDROID if needed).'
        : 'RevenueCat is only supported on device builds.'
    );
  }

  const purchaseResult = await Purchases.purchaseProduct(BLOOD_RED_PRODUCT_ID);
  const customerInfo: CustomerInfo = purchaseResult.customerInfo;

  const hasBloodRed = Boolean(
    customerInfo.entitlements.active[BLOOD_RED_ENTITLEMENT] ||
      customerInfo.allPurchasedProductIdentifiers?.includes(BLOOD_RED_PRODUCT_ID)
  );

  const entitlements = await updateEntitlementsInProfile(
    profileId,
    hasBloodRed,
    currentEntitlements
  );

  return { customerInfo, hasBloodRed, entitlements };
};

export const restoreBloodRedPurchase = async (params: {
  profileId: string;
  currentEntitlements?: Record<string, boolean> | null;
}) => {
  const { profileId, currentEntitlements } = params;
  const ensureResult = await ensureRevenueCatConfigured(profileId);

  if (!ensureResult.ok) {
    throw new Error(
      ensureResult.reason === 'missing_api_key'
        ? 'RevenueCat API key is missing. Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS (and ANDROID if needed).'
        : 'RevenueCat is only supported on device builds.'
    );
  }

  const customerInfo = await Purchases.restorePurchases();
  const hasBloodRed = Boolean(
    customerInfo.entitlements.active[BLOOD_RED_ENTITLEMENT] ||
      customerInfo.allPurchasedProductIdentifiers?.includes(BLOOD_RED_PRODUCT_ID)
  );

  const entitlements = await updateEntitlementsInProfile(
    profileId,
    hasBloodRed,
    currentEntitlements
  );

  return { customerInfo, hasBloodRed, entitlements };
};

export const isPurchaseCancelled = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as any).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  ) {
    return true;
  }
  return false;
};

export const bloodRedHex = '#8B0000';
