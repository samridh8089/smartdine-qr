'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRDesignConfig } from './types';
import { DEFAULT_QR_CONFIG } from './templates';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const QR_EVENT_NAME = 'cleverops:qr_design_updated';
const LOCAL_STORAGE_KEY_PREFIX = 'cleverops_qr_design_';

/**
 * Returns the effective local storage key for a restaurant
 */
export function getQRDesignStorageKey(restaurantId: string): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${restaurantId}`;
}

/**
 * Loads the current QR design configuration for a restaurant with multi-tier fallback:
 * 1. restaurant.settings.qr_design
 * 2. localStorage
 * 3. Supabase qr_design_settings table
 * 4. DEFAULT_QR_CONFIG
 */
export async function loadQRDesignConfig(
  restaurant: any,
  fallbackRestaurantName?: string,
  fallbackLogoUrl?: string
): Promise<QRDesignConfig> {
  const restaurantId = restaurant?.id || 'demo';
  const name = restaurant?.name || fallbackRestaurantName || 'The Foody Hub';
  const logo = restaurant?.logo_url || fallbackLogoUrl || '';

  // 1. Check in-memory restaurant settings
  if (restaurant?.settings?.qr_design && typeof restaurant.settings.qr_design === 'object') {
    return mergeWithDefaults(restaurant.settings.qr_design, name, logo);
  }

  // 2. Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(getQRDesignStorageKey(restaurantId));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return mergeWithDefaults(parsed, name, logo);
        }
      }
    } catch (e) {
      console.warn('Could not read QR design from localStorage:', e);
    }
  }

  // 3. Check Supabase qr_design_settings table
  if (restaurantId && restaurantId !== 'demo' && supabase) {
    try {
      const { data, error } = await supabase
        .from('qr_design_settings')
        .select('config')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (!error && data?.config) {
        return mergeWithDefaults(data.config, name, logo);
      }
    } catch (e) {
      // Table might not exist yet or offline, continue gracefully
    }
  }

  // 4. Default configuration
  return mergeWithDefaults({}, name, logo);
}

/**
 * Merges a saved config with default values so new properties are never undefined
 */
export function mergeWithDefaults(
  config: Partial<QRDesignConfig>,
  restaurantName: string,
  logoUrl: string
): QRDesignConfig {
  return {
    ...DEFAULT_QR_CONFIG,
    ...config,
    text: {
      ...DEFAULT_QR_CONFIG.text,
      ...(config.text || {}),
      restaurantName: config.text?.restaurantName || restaurantName || DEFAULT_QR_CONFIG.text.restaurantName,
      restaurantTypography: {
        ...DEFAULT_QR_CONFIG.text.restaurantTypography,
        ...(config.text?.restaurantTypography || {})
      },
      tableTypography: {
        ...DEFAULT_QR_CONFIG.text.tableTypography,
        ...(config.text?.tableTypography || {})
      },
      scanTypography: {
        ...DEFAULT_QR_CONFIG.text.scanTypography,
        ...(config.text?.scanTypography || {})
      },
      footerTypography: {
        ...DEFAULT_QR_CONFIG.text.footerTypography,
        ...(config.text?.footerTypography || {})
      }
    },
    qr: {
      ...DEFAULT_QR_CONFIG.qr,
      ...(config.qr || {})
    },
    logo: {
      ...DEFAULT_QR_CONFIG.logo,
      ...(config.logo || {}),
      url: config.logo?.url !== undefined ? config.logo.url : logoUrl
    },
    background: {
      ...DEFAULT_QR_CONFIG.background,
      ...(config.background || {}),
      filters: {
        ...DEFAULT_QR_CONFIG.background.filters,
        ...(config.background?.filters || {})
      }
    },
    lighting: {
      ...DEFAULT_QR_CONFIG.lighting,
      ...(config.lighting || {})
    },
    stickers: Array.isArray(config.stickers) ? config.stickers : (DEFAULT_QR_CONFIG.stickers || []),
    frame: {
      ...DEFAULT_QR_CONFIG.frame,
      ...(config.frame || {})
    },
    advanced: {
      ...DEFAULT_QR_CONFIG.advanced,
      ...(config.advanced || {}),
      customElements: config.advanced?.customElements || DEFAULT_QR_CONFIG.advanced.customElements
    }
  };
}

/**
 * Saves the QR design configuration:
 * - Saves in restaurant.settings.qr_design
 * - Attempts to save in qr_design_settings table
 * - Saves in localStorage for instant sync
 * - Broadcasts update event across components & tabs
 */
export async function saveQRDesignConfig(
  restaurant: any,
  config: QRDesignConfig
): Promise<{ success: boolean; error?: string }> {
  const restaurantId = restaurant?.id;
  const updatedConfig = {
    ...config,
    updatedAt: new Date().toISOString()
  };

  try {
    // 1. Cache in localStorage immediately
    if (typeof window !== 'undefined' && restaurantId) {
      try {
        localStorage.setItem(getQRDesignStorageKey(restaurantId), JSON.stringify(updatedConfig));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }

    // 2. Broadcast local event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(QR_EVENT_NAME, {
          detail: { restaurantId, config: updatedConfig }
        })
      );
    }

    // 3. Save into restaurant.settings via db.updateRestaurant
    if (restaurantId && restaurantId !== 'demo') {
      const existingSettings = restaurant.settings || {};
      await db.updateRestaurant(restaurantId, {
        settings: {
          ...existingSettings,
          qr_design: updatedConfig
        }
      });

      // 4. Try saving into qr_design_settings table (upsert)
      try {
        await supabase
          .from('qr_design_settings')
          .upsert({
            restaurant_id: restaurantId,
            template_id: updatedConfig.templateId,
            config: updatedConfig,
            updated_at: new Date().toISOString()
          }, { onConflict: 'restaurant_id' });
      } catch (tableErr) {
        // Suppress if table not present, already saved in restaurant.settings
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving QR design config:', err);
    return { success: false, error: err.message || 'Failed to save QR design.' };
  }
}

/**
 * Custom React Hook that loads and continuously syncs the QR design configuration
 */
export function useQRDesign(restaurant: any) {
  const restaurantId = restaurant?.id || '';
  const [designConfig, setDesignConfig] = useState<QRDesignConfig>(() => {
    // Initial sync read from localStorage or default
    if (typeof window !== 'undefined' && restaurantId) {
      try {
        const stored = localStorage.getItem(getQRDesignStorageKey(restaurantId));
        if (stored) {
          const parsed = JSON.parse(stored);
          return mergeWithDefaults(parsed, restaurant?.name || '', restaurant?.logo_url || '');
        }
      } catch (e) {
        // continue
      }
    }
    if (restaurant?.settings?.qr_design) {
      return mergeWithDefaults(restaurant.settings.qr_design, restaurant?.name || '', restaurant?.logo_url || '');
    }
    return mergeWithDefaults({}, restaurant?.name || '', restaurant?.logo_url || '');
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchConfig() {
      if (!restaurant) return;
      setIsLoading(true);
      const conf = await loadQRDesignConfig(restaurant);
      if (isMounted) {
        setDesignConfig(conf);
        setIsLoading(false);
      }
    }

    fetchConfig();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.config) {
        if (!customEvent.detail.restaurantId || customEvent.detail.restaurantId === restaurantId) {
          setDesignConfig(customEvent.detail.config);
        }
      }
    };

    window.addEventListener(QR_EVENT_NAME, handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(QR_EVENT_NAME, handleUpdate);
    };
  }, [restaurant, restaurantId]);

  return {
    designConfig,
    setDesignConfig,
    isLoading
  };
}
