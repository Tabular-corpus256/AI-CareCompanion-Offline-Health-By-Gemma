import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Linking,
  SafeAreaView, ActivityIndicator, Image, Platform, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { AppText, ScreenHeader, SectionTitle, AppInput } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { useAppDialog } from '@components/DialogProvider';
import { searchNearby, type NearbyPlace } from '@services/PlaceSearchService';
import { LogService } from '@services/LogService';
import { useLocation, type PermissionStatus } from '@hooks/useLocation';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
const TILE_PX = 256; // OSM tile is always 256×256 logical pixels

const CATEGORIES = [
  { key: 'hospital',     label: 'Hospitals',  emoji: '🏥', color: '#E74C3C' },
  { key: 'doctor',       label: 'Doctors',    emoji: '👨‍⚕️', color: '#3498DB' },
  { key: 'pharmacy',     label: 'Pharmacy',   emoji: '💊', color: '#2ECC71' },
  { key: 'clinic',       label: 'Clinics',    emoji: '🏪', color: '#F39C12' },
  { key: 'cardiologist', label: 'Cardiology', emoji: '❤️', color: '#E84393' },
  { key: 'dentist',      label: 'Dentist',    emoji: '🦷', color: '#9B59B6' },
];

// ─── TILE MATHS ───────────────────────────────────────────────────────────────
function latLngToTileInfo(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xFrac = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFrac =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(xFrac);
  const ty = Math.floor(yFrac);
  const px = (xFrac - tx) * TILE_PX;
  const py = (yFrac - ty) * TILE_PX;
  return { tx, ty, px, py };
}

// ESRI World Street Map — public, no API key, no User-Agent header required.
// ⚠️  ESRI tile order is z/y/x  (NOT z/x/y like OSM)
function tileUrl(x: number, y: number, z: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
}

// ─── MAP TILES COMPONENT ──────────────────────────────────────────────────────
// 2×2 grid of ESRI tiles centred on the target lat/lng with an exact pin.
interface OsmMapTilesProps {
  lat: number;
  lng: number;
  zoom?: number;
  width: number;
  height: number;
  pinColor?: string;
  pinIcon?: string;
}

function OsmMapTiles({
  lat, lng, zoom = 15, width, height,
  pinColor = '#1a73e8', pinIcon = 'location-sharp',
}: OsmMapTilesProps) {
  const { tx, ty, px, py } = useMemo(
    () => latLngToTileInfo(lat, lng, zoom),
    [lat, lng, zoom],
  );

  // Pick the 4 tiles so the point lands near the centre of the 2×2 grid
  const leftTile = px < TILE_PX / 2 ? tx - 1 : tx;
  const topTile  = py < TILE_PX / 2 ? ty - 1 : ty;

  // Marker position inside the 2×2 composite (0 – 2*TILE_PX)
  const markerCX = leftTile < tx ? TILE_PX + px : px;
  const markerCY = topTile  < ty ? TILE_PX + py : py;

  // Scale to the rendered display dimensions
  const tileW = width  / 2;
  const tileH = height / 2;
  const markerX = (markerCX / (TILE_PX * 2)) * width;
  const markerY = (markerCY / (TILE_PX * 2)) * height;

  const tiles = [
    { x: leftTile,     y: topTile,      left: 0,     top: 0     },
    { x: leftTile + 1, y: topTile,      left: tileW, top: 0     },
    { x: leftTile,     y: topTile + 1,  left: 0,     top: tileH },
    { x: leftTile + 1, y: topTile + 1,  left: tileW, top: tileH },
  ];

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {/* Fallback background while tiles load */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#dde8f0', justifyContent: 'center', alignItems: 'center' }]}>
        <AppIcon name="map-outline" size={36} color="#aac4d8" />
      </View>

      {/* 4 OSM tiles */}
      {tiles.map((t, i) => (
        <Image
          key={i}
          source={{ uri: tileUrl(t.x, t.y, zoom) }}
          style={{ position: 'absolute', left: t.left, top: t.top, width: tileW, height: tileH }}
          resizeMode="cover"
        />
      ))}

      {/* Attribution */}
      <View style={tm.attribution}>
        <AppText style={{ fontSize: 8, color: '#555' }}>© Esri</AppText>
      </View>

      {/* Marker pin at exact position */}
      <View
        style={[tm.pinWrap, { left: markerX - 15, top: markerY - 34 }]}
        pointerEvents="none">
        <View style={[tm.pinCircle, { backgroundColor: pinColor }]}>
          <AppIcon name={pinIcon} size={14} color="#fff" />
        </View>
        <View style={[tm.pinTail, { borderTopColor: pinColor }]} />
      </View>
    </View>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function mapsUrlFor(place: NearbyPlace): string {
  if (place.mapsUri) return place.mapsUri;
  if (place.placeId) return `https://maps.google.com/maps/place/?q=place_id:${place.placeId}`;
  const q = encodeURIComponent(`${place.name ?? ''} ${place.address ?? ''}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function directionsUrl(place: NearbyPlace, userLat: number, userLng: number): string {
  if (place.lat && place.lng)
    return `https://www.google.com/maps/dir/${userLat},${userLng}/${place.lat},${place.lng}`;
  const dest = encodeURIComponent(`${place.name ?? ''} ${place.address ?? ''}`.trim());
  return `https://www.google.com/maps/dir/${userLat},${userLng}/${dest}`;
}

// ─── MAP HEADER ───────────────────────────────────────────────────────────────
interface MapHeaderProps {
  lat: number; lng: number; locText: string;
  detecting: boolean; permissionStatus: PermissionStatus;
  error: string | null; accuracy: number | null;
  retry: () => void; openSettings: () => void;
  colors: any; br: any;
}

function MapHeader({ lat, lng, locText, detecting, permissionStatus, error, accuracy, retry, openSettings, colors, br }: MapHeaderProps) {
  const isIp        = permissionStatus === 'ip';
  const hasLocation = isIp;
  const mapW = SCREEN_W - 32;

  return (
    <View style={[mh.container, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: br.xl }]}>

      {/* ── Map image zone ── */}
      <View style={{ height: 160, overflow: 'hidden' }}>
        {hasLocation ? (
          <OsmMapTiles lat={lat} lng={lng} zoom={14} width={mapW} height={160} pinColor="#1a73e8" pinIcon="location-sharp" />
        ) : (
          /* Placeholder grid when no location yet */
          <View style={[StyleSheet.absoluteFillObject, mh.fallback]}>
            {[...Array(5)].map((_, i) => (
              <View key={`h${i}`} style={[mh.hLine, { top: `${(i + 1) * 16}%` as any }]} />
            ))}
            {[...Array(5)].map((_, i) => (
              <View key={`v${i}`} style={[mh.vLine, { left: `${(i + 1) * 16}%` as any }]} />
            ))}
            <AppIcon name="map-outline" size={48} color="#1a73e830" />
          </View>
        )}

        {/* Error overlay */}
        {permissionStatus === 'error' && !detecting && (
          <View style={[StyleSheet.absoluteFillObject, mh.permOverlay]}>
            <View style={[mh.permIconWrap, { backgroundColor: '#F39C1220' }]}>
              <AppIcon name="wifi-outline" size={30} color="#F39C12" />
            </View>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: '#F39C12', marginTop: 8 }}>
              Could not detect location
            </AppText>
            <AppText style={{ fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}>
              Check your internet connection and tap Retry.
            </AppText>
          </View>
        )}

        {/* Bottom fade */}
        <View style={[mh.fade, { backgroundColor: colors.surface }]} />

        {/* Accuracy badge */}
        {accuracy != null && (
          <View style={[mh.accBadge, { backgroundColor: '#1a73e8dd' }]}>
            <AppIcon name="navigate-circle" size={10} color="#fff" />
            <AppText style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>±{Math.round(accuracy)}m</AppText>
          </View>
        )}
      </View>

      {/* ── Info row ── */}
      <View style={mh.infoRow}>
        <View style={{ flex: 1 }}>
          {detecting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText variant="small" color="secondary">Detecting your location…</AppText>
            </View>
          ) : permissionStatus === 'error' ? (
            <View style={{ gap: 6 }}>
              <AppText variant="small" style={{ color: colors.error }}>{error}</AppText>
              <TouchableOpacity onPress={retry} style={[mh.pill, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                <AppIcon name="refresh-outline" size={13} color="#fff" />
                <AppText style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>Retry</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            /* IP location — city level */
            <View style={{ gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[mh.greenDot, { backgroundColor: '#00B894' }]} />
                <AppText variant="smallMedium" color="secondary">Location detected</AppText>
              </View>
              <AppText variant="bodyMedium" style={{ fontWeight: '700', color: colors.textPrimary }}>{locText}</AppText>
              <AppText variant="small" color="tertiary"
                style={{ fontFamily: Platform.select({ android: 'monospace', ios: 'Courier' }) }}>
                {lat.toFixed(5)},  {lng.toFixed(5)}
              </AppText>
            </View>
          )}
        </View>

        {hasLocation && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.google.com/maps/@${lat},${lng},15z`)}
            style={[mh.mapsBtn, { backgroundColor: '#1a73e8' }]}
            activeOpacity={0.8}>
            <AppIcon name="map" size={15} color="#fff" />
            <AppText variant="small" style={{ color: '#fff', fontWeight: '700' }}>Open</AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── PLACE CARD ───────────────────────────────────────────────────────────────
interface PlaceCardProps {
  place: NearbyPlace; userLat: number; userLng: number;
  colors: any; br: any;
}

function PlaceCard({ place, userLat, userLng, colors, br }: PlaceCardProps) {
  const hasCoords = !!(place.lat && place.lng);
  const mapsUrl = mapsUrlFor(place);
  const dirUrl  = directionsUrl(place, userLat, userLng);
  const cardW   = SCREEN_W - 32;

  const ratingColor =
    (place.rating ?? 0) >= 4 ? '#00B894' :
    (place.rating ?? 0) >= 3 ? '#F39C12' : '#E74C3C';

  return (
    <View style={[pc.wrapper, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: br.xl }]}>

      {/* ── MAP THUMBNAIL ── */}
      <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)} activeOpacity={0.9}>
        <View style={{ height: 160, overflow: 'hidden' }}>
          {hasCoords ? (
            <OsmMapTiles
              lat={place.lat!} lng={place.lng!}
              zoom={15} width={cardW} height={160}
              pinColor="#E74C3C" pinIcon="medical"
            />
          ) : (
            /* No coords — show a styled placeholder */
            <View style={[pc.thumbFallback, { backgroundColor: '#e8f0fe' }]}>
              <AppIcon name="location-outline" size={36} color="#1a73e840" />
              <AppText style={{ fontSize: 11, color: '#1a73e870', marginTop: 6 }}>
                Tap to open in Google Maps
              </AppText>
            </View>
          )}

          {/* Open/Closed badge */}
          {place.openNow !== undefined && (
            <View style={[pc.openBadge, { backgroundColor: place.openNow ? '#00B89433' : '#E74C3C33' }]}>
              <View style={[pc.openDot, { backgroundColor: place.openNow ? '#00B894' : '#E74C3C' }]} />
              <AppText style={{ fontSize: 10, fontWeight: '800', color: place.openNow ? '#00B894' : '#E74C3C' }}>
                {place.openNow ? 'OPEN NOW' : 'CLOSED'}
              </AppText>
            </View>
          )}

          {/* Maps-grounded ribbon */}
          {place.mapsUri && (
            <View style={[pc.ribbon, { backgroundColor: '#1a73e8cc' }]}>
              <AppIcon name="checkmark-circle" size={9} color="#fff" />
              <AppText style={{ fontSize: 8, color: '#fff', fontWeight: '800', letterSpacing: 0.4 }}>
                GOOGLE MAPS VERIFIED
              </AppText>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── BODY ── */}
      <View style={pc.body}>

        {/* Name + rating */}
        <View style={pc.nameRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary, lineHeight: 22 }}>
              {place.name}
            </AppText>
            {!!place.types && (
              <View style={[pc.typePill, { backgroundColor: colors.primaryMuted }]}>
                <AppText style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{place.types}</AppText>
              </View>
            )}
          </View>

          {place.rating != null ? (
            <View style={[pc.ratingBox, { backgroundColor: `${ratingColor}18`, borderColor: `${ratingColor}40` }]}>
              <AppText style={{ fontSize: 13 }}>⭐</AppText>
              <AppText style={{ fontSize: 15, fontWeight: '900', color: ratingColor }}>{Number(place.rating).toFixed(1)}</AppText>
              <AppText style={{ fontSize: 10, color: ratingColor, opacity: 0.7 }}>/5</AppText>
            </View>
          ) : (
            <View style={[pc.ratingBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
              <AppText style={{ fontSize: 11, color: colors.textTertiary }}>No rating</AppText>
            </View>
          )}
        </View>

        <View style={[pc.divider, { backgroundColor: colors.borderLight }]} />

        {/* Address */}
        {!!place.address && (
          <View style={pc.infoRow}>
            <View style={[pc.iconBox, { backgroundColor: '#1a73e815' }]}>
              <AppIcon name="location-outline" size={13} color="#1a73e8" />
            </View>
            <AppText variant="small" color="secondary" style={{ flex: 1 }}>{place.address}</AppText>
          </View>
        )}

        {/* Distance */}
        {!!place.distance && (
          <View style={pc.infoRow}>
            <View style={[pc.iconBox, { backgroundColor: '#9B59B615' }]}>
              <AppIcon name="navigate-outline" size={13} color="#9B59B6" />
            </View>
            <AppText variant="small" style={{ color: '#9B59B6', fontWeight: '600' }}>{place.distance} away</AppText>
          </View>
        )}

        {/* Coordinates */}
        {hasCoords && (
          <View style={pc.infoRow}>
            <View style={[pc.iconBox, { backgroundColor: '#F39C1215' }]}>
              <AppIcon name="navigate-circle-outline" size={13} color="#F39C12" />
            </View>
            <AppText variant="small"
              style={{ color: '#F39C12', fontFamily: Platform.select({ android: 'monospace', ios: 'Courier' }) }}>
              {place.lat!.toFixed(6)},  {place.lng!.toFixed(6)}
            </AppText>
          </View>
        )}

        {/* Phone */}
        {!!place.phone && (
          <TouchableOpacity style={pc.infoRow} onPress={() => Linking.openURL(`tel:${place.phone}`)} activeOpacity={0.7}>
            <View style={[pc.iconBox, { backgroundColor: '#2ECC7115' }]}>
              <AppIcon name="call-outline" size={13} color="#2ECC71" />
            </View>
            <AppText variant="small" style={{ color: '#2ECC71', fontWeight: '600', textDecorationLine: 'underline' }}>
              {place.phone}
            </AppText>
          </TouchableOpacity>
        )}

        <View style={[pc.divider, { backgroundColor: colors.borderLight }]} />

        {/* Action buttons */}
        <View style={pc.actions}>
          <TouchableOpacity style={[pc.btn, { backgroundColor: '#1a73e8', flex: 2 }]}
            onPress={() => Linking.openURL(dirUrl)} activeOpacity={0.85}>
            <AppIcon name="navigate" size={14} color="#fff" />
            <AppText style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>Directions</AppText>
          </TouchableOpacity>

          {!!place.phone && (
            <TouchableOpacity style={[pc.btn, { backgroundColor: '#2ECC71', flex: 1 }]}
              onPress={() => Linking.openURL(`tel:${place.phone}`)} activeOpacity={0.85}>
              <AppIcon name="call" size={14} color="#fff" />
              <AppText style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>Call</AppText>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[pc.btn, { backgroundColor: colors.primaryMuted, flex: 1 }]}
            onPress={() => Linking.openURL(mapsUrl)} activeOpacity={0.85}>
            <AppIcon name="map-outline" size={14} color={colors.primary} />
            <AppText style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>Maps</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export function FindNearbyDoctorScreen() {
  const { colors, borderRadius: br } = useTheme();
  const { showDialog } = useAppDialog();
  const navigation = useNavigation();
  const location = useLocation();

  const [results, setResults] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string, catKey?: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setActiveKey(catKey ?? null);
    setResults([]);
    let places: NearbyPlace[] = [];
    let errorMsg: string | undefined;
    try {
      places = await searchNearby({ query: query.trim(), lat: location.lat, lng: location.lng });
      setResults(places);
    } catch (e: any) {
      errorMsg = e?.message ?? 'Could not find results.';
      showDialog({ title: 'Search Failed', message: errorMsg!, icon: 'alert-circle', iconColor: '#e74c3c' });
    } finally {
      setLoading(false);
      await LogService.logPlaceSearch({
        query: query.trim(), lat: location.lat, lng: location.lng,
        resultCount: places.length, error: errorMsg,
      });
    }
  }, [location.lat, location.lng, showDialog]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Find Nearby" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Map header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <MapHeader
            lat={location.lat} lng={location.lng}
            locText={location.locText} detecting={location.detecting}
            permissionStatus={location.permissionStatus}
            error={location.error} accuracy={location.accuracy}
            retry={location.retry} openSettings={location.openSettings}
            colors={colors} br={br}
          />
        </View>

        {/* Categories */}
        <SectionTitle title="What are you looking for?" size="sm" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {CATEGORIES.map(c => {
            const active = activeKey === c.key;
            return (
              <TouchableOpacity key={c.key} onPress={() => handleSearch(c.key, c.key)} activeOpacity={0.75}
                style={[s.catBtn, { backgroundColor: active ? c.color : colors.surface, borderColor: active ? c.color : colors.borderLight }]}>
                <AppText style={{ fontSize: 24 }}>{c.emoji}</AppText>
                <AppText style={{ fontSize: 11, fontWeight: '700', marginTop: 5, color: active ? '#fff' : colors.textPrimary }}>
                  {c.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search bar */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <AppInput placeholder="e.g. pediatrician, eye specialist…" value={lastQuery}
            onChangeText={setLastQuery} onSubmitEditing={() => handleSearch(lastQuery)}
            returnKeyType="search"
            leftIcon={<AppIcon name="search" size={18} color={colors.textSecondary} />} />
        </View>

        {/* Loading */}
        {loading && (
          <View style={s.loadBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="bodyMedium" color="secondary" style={{ marginTop: 14, fontWeight: '600' }}>
              Searching with Gemini + Google Maps…
            </AppText>
            <AppText variant="small" color="tertiary" style={{ marginTop: 4 }}>
              Grounding results to your location
            </AppText>
          </View>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View style={[s.resultsBar, { backgroundColor: colors.primaryMuted, borderRadius: br.md }]}>
              <AppIcon name="checkmark-circle-outline" size={16} color={colors.primary} />
              <AppText variant="smallMedium" style={{ color: colors.primary, flex: 1 }}>
                {results.length} result{results.length !== 1 ? 's' : ''} near {location.locText}
              </AppText>
              <AppText variant="small" color="tertiary">Maps grounded</AppText>
            </View>
            {results.map((place, i) => (
              <PlaceCard key={i} place={place} userLat={location.lat} userLng={location.lng} colors={colors} br={br} />
            ))}
          </View>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && activeKey !== null && (
          <View style={s.emptyBox}>
            <AppText style={{ fontSize: 48 }}>🗺️</AppText>
            <AppText variant="bodyMedium" style={{ fontWeight: '800', marginTop: 12, color: colors.textPrimary }}>
              No results found
            </AppText>
            <AppText variant="small" color="secondary" style={{ marginTop: 6, textAlign: 'center', maxWidth: 260 }}>
              Try a different search term or check your internet connection.
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const tm = StyleSheet.create({
  attribution: { position: 'absolute', bottom: 2, right: 4, backgroundColor: '#ffffffaa', paddingHorizontal: 3, borderRadius: 3 },
  pinWrap: { position: 'absolute', alignItems: 'center' },
  pinCircle: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4,
  },
  pinTail: {
    width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1,
  },
});

const mh = StyleSheet.create({
  container: { overflow: 'hidden', borderWidth: 1 },
  fallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e8f0fe' },
  hLine: { position: 'absolute', left: 0, right: 0, height: 1, borderTopWidth: 1, borderColor: '#1a73e818' },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, borderLeftWidth: 1, borderColor: '#1a73e818' },
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, opacity: 0.9 },
  permOverlay: { ...StyleSheet.absoluteFillObject as any, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fdee' },
  permIconWrap: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  accBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  greenDot: { width: 7, height: 7, borderRadius: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18 },
  mapsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, elevation: 2, shadowColor: '#1a73e8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
});

const pc = StyleSheet.create({
  wrapper: { borderWidth: 1, marginBottom: 14, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  thumbFallback: { ...StyleSheet.absoluteFillObject as any, justifyContent: 'center', alignItems: 'center' },
  openBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  ribbon: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  body: { padding: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 5 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  iconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
});

const s = StyleSheet.create({
  catRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catBtn: { width: 86, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  loadBox: { padding: 48, alignItems: 'center' },
  resultsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
});

export default FindNearbyDoctorScreen;
