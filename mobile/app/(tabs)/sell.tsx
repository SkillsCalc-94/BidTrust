import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import AIEstimateCard, { AIEstimate } from '../../components/AIEstimateCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { label: 'Electronics', emoji: '📱' },
  { label: 'Furniture', emoji: '🛋️' },
  { label: 'Clothing', emoji: '👕' },
  { label: 'Vehicles', emoji: '🚗' },
  { label: 'Collectibles', emoji: '💎' },
  { label: 'Sports', emoji: '⚽' },
  { label: 'Books', emoji: '📚' },
  { label: 'Other', emoji: '📦' },
];

const CONDITIONS = [
  { value: 'new', label: 'New', emoji: '🆕', desc: 'Brand new, never used, in original packaging' },
  { value: 'like_new', label: 'Like New', emoji: '✨', desc: 'Used once or twice, no signs of wear' },
  { value: 'good', label: 'Good', emoji: '👍', desc: 'Light use, minor wear, fully functional' },
  { value: 'fair', label: 'Fair', emoji: '🤝', desc: 'Moderate use, visible wear, functional' },
  { value: 'poor', label: 'Poor', emoji: '🔧', desc: 'Heavy wear, may have defects' },
];

const DURATION_OPTIONS = [
  { label: '1d', days: '1' },
  { label: '3d', days: '3' },
  { label: '7d', days: '7' },
  { label: '14d', days: '14' },
];

export default function SellScreen() {
  const [step, setStep] = useState(1);

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);

  // AI estimate state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<AIEstimate | null>(null);
  const [aiError, setAiError] = useState('');

  // Qualifying questions for AI
  const [originalPrice, setOriginalPrice] = useState('');
  const [q1Defects, setQ1Defects] = useState('');
  const [q2Accessories, setQ2Accessories] = useState('');
  const [q3Reason, setQ3Reason] = useState('');

  // Step 2: Item details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');

  // Step 3: Pricing
  const [startingPrice, setStartingPrice] = useState('');
  const [useReserve, setUseReserve] = useState(false);
  const [reservePrice, setReservePrice] = useState('');
  const [useBuyNow, setUseBuyNow] = useState(false);
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [auctionDays, setAuctionDays] = useState('7');
  const [auctionHours, setAuctionHours] = useState('0');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  async function pickImages() {
    if (Platform.OS === 'web') {
      return new Promise<void>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e: any) => {
          const files: FileList = e.target.files;
          if (!files || files.length === 0) { resolve(); return; }
          const readers: Promise<string>[] = Array.from(files).slice(0, 10).map(
            (file) =>
              new Promise<string>((res) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
              })
          );
          Promise.all(readers).then((uris) => {
            setPhotos(prev => [...prev, ...uris].slice(0, 10));
            resolve();
          });
        };
        input.click();
      });
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, 10));
    }
  }

  async function takePhoto() {
    if (Platform.OS === 'web') {
      return new Promise<void>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) { resolve(); return; }
          const reader = new FileReader();
          reader.onload = () => {
            setPhotos(prev => [...prev, reader.result as string].slice(0, 10));
            resolve();
          };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setPhotos(prev => [...prev, result.assets[0].uri].slice(0, 10));
    }
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  async function runAIEstimate() {
    if (photos.length === 0) {
      Alert.alert('Add Photos', 'Please add at least one photo first');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const formData = new FormData();
      photos.slice(0, 5).forEach((uri, i) => {
        const ext = uri.split('.').pop() || 'jpg';
        (formData as any).append('images', {
          uri,
          type: `image/${ext}`,
          name: `photo_${i}.${ext}`,
        } as any);
      });
      formData.append('item_name', title || 'Unknown item');
      formData.append('condition', condition || 'good');
      formData.append('age_years', '1');
      formData.append('category', category || 'Other');
      if (description) formData.append('description', description);
      if (originalPrice) formData.append('original_price', originalPrice);
      if (q1Defects) formData.append('q1_defects', q1Defects);
      if (q2Accessories) formData.append('q2_accessories', q2Accessories);
      if (q3Reason) formData.append('q3_reason', q3Reason);

      const data = await api.postFormData<{ estimate: AIEstimate }>('/ai/estimate', formData);
      setAiEstimate(data.estimate);
    } catch (err: any) {
      setAiError(err.message || 'AI estimate failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function runAIDescribe() {
    if (photos.length === 0) return;
    setAiLoading(true);
    try {
      const formData = new FormData();
      const uri = photos[0];
      const ext = uri.split('.').pop() || 'jpg';
      (formData as any).append('image', {
        uri,
        type: `image/${ext}`,
        name: `photo.${ext}`,
      } as any);

      const data = await api.postFormData<any>('/ai/describe', formData);
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.suggested_category) setCategory(data.suggested_category);
    } catch (err: any) {
      console.warn('AI describe failed:', err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function useSuggestedPrices() {
    if (!aiEstimate) return;
    const sp = aiEstimate.sell_price_range?.low || aiEstimate.suggested_starting_price;
    const bn = aiEstimate.sell_price_range?.high || aiEstimate.suggested_buy_now_price;
    if (sp) setStartingPrice(String(Math.round(sp)));
    if (bn) { setBuyNowPrice(String(Math.round(bn))); setUseBuyNow(true); }
  }

  async function handleSubmit() {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title'); return; }
    if (!category) { Alert.alert('Required', 'Please select a category'); return; }
    if (!condition) { Alert.alert('Required', 'Please select a condition'); return; }
    if (!startingPrice || isNaN(parseFloat(startingPrice))) {
      Alert.alert('Required', 'Please enter a valid starting price');
      return;
    }

    setSubmitting(true);
    try {
      const days = parseInt(auctionDays) || 7;
      const hours = parseInt(auctionHours) || 0;
      const endTime = new Date(Date.now() + (days * 24 + hours) * 60 * 60 * 1000);

      const formData = new FormData();
      photos.forEach((uri, i) => {
        const ext = uri.split('.').pop() || 'jpg';
        (formData as any).append('images', {
          uri,
          type: `image/${ext}`,
          name: `photo_${i}.${ext}`,
        } as any);
      });

      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('location', location.trim());
      formData.append('starting_price', startingPrice);
      formData.append('auction_end_time', endTime.toISOString());
      if (useReserve && reservePrice) formData.append('reserve_price', reservePrice);
      if (useBuyNow && buyNowPrice) formData.append('buy_now_price', buyNowPrice);
      if (aiEstimate) {
        formData.append('ai_estimated_value_low', String(aiEstimate.estimated_market_value_low || ''));
        formData.append('ai_estimated_value_high', String(aiEstimate.estimated_market_value_high || ''));
      }

      const data = await api.postFormData<{ listing: any }>('/listings', formData);
      setCreatedListingId(data.listing.id);
      setStep(5); // success step
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setStep(1);
    setPhotos([]);
    setAiEstimate(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setCondition('');
    setLocation('');
    setStartingPrice('');
    setReservePrice('');
    setBuyNowPrice('');
    setUseReserve(false);
    setUseBuyNow(false);
    setAuctionDays('7');
    setAuctionHours('0');
    setCreatedListingId(null);
  }

  // Premium progress bar
  const renderProgressBar = () => {
    if (step > 4) return null;
    const steps = [
      { label: 'Photos', icon: 'camera' },
      { label: 'Details', icon: 'create' },
      { label: 'Pricing', icon: 'pricetag' },
      { label: 'Review', icon: 'checkmark-circle' },
    ];
    return (
      <View style={styles.progressContainer}>
        {steps.map((s, i) => {
          const isDone = i + 1 < step;
          const isActive = i + 1 === step;
          return (
            <React.Fragment key={i}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  isDone && styles.progressDotDone,
                  isActive && styles.progressDotActive,
                ]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  ) : (
                    <Ionicons
                      name={s.icon as any}
                      size={12}
                      color={isActive ? '#fff' : '#4a4a6a'}
                    />
                  )}
                </View>
                <Text style={[
                  styles.progressLabel,
                  isActive && styles.progressLabelActive,
                  isDone && styles.progressLabelDone,
                ]}>
                  {s.label}
                </Text>
              </View>
              {i < 3 && (
                <View style={[styles.progressLine, (i + 1 < step) && styles.progressLineActive]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // Step 1: Photos & AI
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Add Photos</Text>
      <Text style={styles.stepSubtitle}>Up to 10 photos. First photo is the cover.</Text>

      {/* Upload zone */}
      {photos.length === 0 ? (
        <TouchableOpacity style={styles.uploadZone} onPress={pickImages}>
          <View style={styles.uploadIconWrap}>
            <Ionicons name="camera-outline" size={36} color="#e94560" />
          </View>
          <Text style={styles.uploadZoneTitle}>Tap to add photos</Text>
          <Text style={styles.uploadZoneSubtitle}>or drag & drop — max 10 images</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip} contentContainerStyle={styles.photoStripContent}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photoThumb} />
              {i === 0 && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}>
                <Ionicons name="close" size={10} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 10 && (
            <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages}>
              <Ionicons name="add" size={28} color="#4a4a6a" />
              <Text style={styles.addMoreText}>Add</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.photoActionBtn} onPress={pickImages}>
          <Ionicons name="images-outline" size={18} color="#a0a0b8" />
          <Text style={styles.photoActionBtnText}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoActionBtn} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={18} color="#a0a0b8" />
          <Text style={styles.photoActionBtnText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {/* AI Section */}
      {photos.length > 0 && (
        <View style={styles.aiSection}>
          <View style={styles.aiSectionHeader}>
            <View style={styles.aiIconBadge}>
              <Text style={styles.aiIconBadgeText}>AI</Text>
            </View>
            <View style={styles.aiHeaderText}>
              <Text style={styles.aiTitle}>✨ AI Estimate</Text>
              <Text style={styles.aiSubtitle}>Instant market value from your photos</Text>
            </View>
          </View>

          {/* Qualifying questions */}
          <View style={styles.qualifySection}>
            <Text style={styles.qualifyTitle}>3 Quick Questions → Better Estimate</Text>

            <View style={styles.qualifyField}>
              <Text style={styles.qualifyLabel}>💰 What did you originally pay? (R)</Text>
              <View style={styles.qualifyPriceRow}>
                <Text style={styles.qualifyCurrency}>R</Text>
                <TextInput
                  style={styles.qualifyPriceInput}
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#4a4a6a"
                />
              </View>
            </View>

            <View style={styles.qualifyField}>
              <Text style={styles.qualifyLabel}>🔧 Any defects or repairs needed?</Text>
              <TextInput
                style={styles.qualifyInput}
                value={q1Defects}
                onChangeText={setQ1Defects}
                placeholder="e.g. Minor scratch on lid, fully functional"
                placeholderTextColor="#4a4a6a"
              />
            </View>

            <View style={styles.qualifyField}>
              <Text style={styles.qualifyLabel}>📦 Original packaging or accessories?</Text>
              <TextInput
                style={styles.qualifyInput}
                value={q2Accessories}
                onChangeText={setQ2Accessories}
                placeholder="e.g. Yes, box and charger included"
                placeholderTextColor="#4a4a6a"
              />
            </View>

            <View style={[styles.qualifyField, { marginBottom: 0 }]}>
              <Text style={styles.qualifyLabel}>🤔 Why are you selling?</Text>
              <TextInput
                style={styles.qualifyInput}
                value={q3Reason}
                onChangeText={setQ3Reason}
                placeholder="e.g. Upgrading to newer model"
                placeholderTextColor="#4a4a6a"
              />
            </View>
          </View>

          <View style={styles.aiButtons}>
            <TouchableOpacity
              style={[styles.aiBtn, aiLoading && styles.btnDisabled]}
              onPress={runAIEstimate}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="flash" size={16} color="#fff" />
                  <Text style={styles.aiBtnText}>Get AI Estimate</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aiDescribeBtn, aiLoading && styles.btnDisabled]}
              onPress={runAIDescribe}
              disabled={aiLoading}
            >
              <Ionicons name="sparkles-outline" size={16} color="#f97316" />
              <Text style={styles.aiDescribeBtnText}>Auto-fill Details</Text>
            </TouchableOpacity>
          </View>

          {aiError ? (
            <View style={styles.aiErrorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#e94560" />
              <Text style={styles.aiError}>{aiError}</Text>
            </View>
          ) : null}

          {aiEstimate && (
            <>
              <AIEstimateCard estimate={aiEstimate} />
              <TouchableOpacity style={styles.usePricesBtn} onPress={useSuggestedPrices}>
                <Ionicons name="arrow-forward-circle" size={16} color="#e94560" />
                <Text style={styles.usePricesBtnText}>Use Suggested Prices</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.nextBtn, photos.length === 0 && styles.btnDisabled]}
        onPress={() => setStep(2)}
        disabled={photos.length === 0}
      >
        <Text style={styles.nextBtnText}>Next: Item Details</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Step 2: Item details
  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Item Details</Text>
      <Text style={styles.stepSubtitle}>Tell buyers what you're selling.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Apple MacBook Pro 2021 M1"
          placeholderTextColor="#4a4a6a"
          maxLength={100}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the item, its features, history..."
          placeholderTextColor="#4a4a6a"
          multiline
          numberOfLines={4}
          maxLength={2000}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.label}
              style={[styles.categoryGridItem, category === cat.label && styles.categoryGridItemActive]}
              onPress={() => setCategory(cat.label)}
            >
              <Text style={styles.categoryGridEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryGridText, category === cat.label && styles.categoryGridTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Condition *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conditionPillRow}>
          {CONDITIONS.map(cond => (
            <TouchableOpacity
              key={cond.value}
              style={[styles.conditionPill, condition === cond.value && styles.conditionPillActive]}
              onPress={() => setCondition(cond.value)}
            >
              <Text style={styles.conditionPillEmoji}>{cond.emoji}</Text>
              <Text style={[styles.conditionPillText, condition === cond.value && styles.conditionPillTextActive]}>
                {cond.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {condition && (
          <View style={styles.conditionDesc}>
            <Ionicons name="information-circle-outline" size={13} color="#a0a0b8" />
            <Text style={styles.conditionDescText}>
              {CONDITIONS.find(c => c.value === condition)?.desc}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Location</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="location-outline" size={16} color="#4a4a6a" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inputFlat}
            value={location}
            onChangeText={setLocation}
            placeholder="City, State"
            placeholderTextColor="#4a4a6a"
          />
        </View>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={18} color="#a0a0b8" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { flex: 1 }, (!title || !category || !condition) && styles.btnDisabled]}
          onPress={() => setStep(3)}
          disabled={!title || !category || !condition}
        >
          <Text style={styles.nextBtnText}>Next: Pricing</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 3: Pricing
  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Pricing & Auction</Text>
      <Text style={styles.stepSubtitle}>Set your starting price and duration.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Starting Price *</Text>
        <View style={styles.largePriceRow}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>R</Text>
          </View>
          <TextInput
            style={styles.largePriceInput}
            value={startingPrice}
            onChangeText={setStartingPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#252538"
          />
        </View>
        {aiEstimate?.sell_price_range?.low != null && (
          <View style={styles.aiHint}>
            <Ionicons name="flash-outline" size={12} color="#f97316" />
            <Text style={styles.aiHintText}>
              AI suggests: R{Math.round(aiEstimate.sell_price_range.low).toLocaleString('en-ZA')} – R{Math.round(aiEstimate.sell_price_range.high).toLocaleString('en-ZA')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.field}>
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <View style={styles.toggleIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#a0a0b8" />
            </View>
            <View>
              <Text style={styles.toggleLabel}>Reserve Price</Text>
              <Text style={styles.toggleSubtext}>Minimum acceptable bid</Text>
            </View>
          </View>
          <Switch
            value={useReserve}
            onValueChange={setUseReserve}
            trackColor={{ false: '#252538', true: '#e94560' }}
            thumbColor="#fff"
          />
        </View>
        {useReserve && (
          <View style={styles.priceInputRow}>
            <Text style={styles.currencySymbol}>R</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={reservePrice}
              onChangeText={setReservePrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#4a4a6a"
            />
          </View>
        )}
      </View>

      <View style={styles.field}>
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <View style={styles.toggleIconWrap}>
              <Ionicons name="flash-outline" size={18} color="#a0a0b8" />
            </View>
            <View>
              <Text style={styles.toggleLabel}>Buy Now Price</Text>
              <Text style={styles.toggleSubtext}>Allow instant purchase</Text>
            </View>
          </View>
          <Switch
            value={useBuyNow}
            onValueChange={setUseBuyNow}
            trackColor={{ false: '#252538', true: '#e94560' }}
            thumbColor="#fff"
          />
        </View>
        {useBuyNow && (
          <View style={styles.priceInputRow}>
            <Text style={styles.currencySymbol}>R</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={buyNowPrice}
              onChangeText={setBuyNowPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#4a4a6a"
            />
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Auction Duration</Text>
        <View style={styles.durationSegmented}>
          {DURATION_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.days}
              style={[styles.durationSegmentBtn, auctionDays === opt.days && styles.durationSegmentBtnActive]}
              onPress={() => setAuctionDays(opt.days)}
            >
              <Text style={[styles.durationSegmentText, auctionDays === opt.days && styles.durationSegmentTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.durationHint}>Min 1 hour, max 14 days</Text>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={18} color="#a0a0b8" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { flex: 1 }, !startingPrice && styles.btnDisabled]}
          onPress={() => setStep(4)}
          disabled={!startingPrice}
        >
          <Text style={styles.nextBtnText}>Next: Review</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 4: Review
  const renderStep4 = () => {
    const days = parseInt(auctionDays) || 7;
    const hours = parseInt(auctionHours) || 0;
    const endDate = new Date(Date.now() + (days * 24 + hours) * 60 * 60 * 1000);

    return (
      <View>
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.stepSubtitle}>Everything look good? Go live!</Text>

        {/* Photo carousel preview */}
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotoStrip} contentContainerStyle={{ gap: 8 }}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.reviewPhotoWrap}>
                <Image source={{ uri }} style={styles.reviewPhotoThumb} />
                {i === 0 && <View style={styles.reviewPhotoPrimaryDot} />}
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>{title}</Text>
          <View style={styles.reviewMetaRow}>
            <View style={styles.reviewMetaBadge}>
              <Text style={styles.reviewMetaBadgeText}>{category}</Text>
            </View>
            <View style={styles.reviewMetaBadge}>
              <Text style={styles.reviewMetaBadgeText}>{CONDITIONS.find(c => c.value === condition)?.emoji} {CONDITIONS.find(c => c.value === condition)?.label}</Text>
            </View>
            {location ? (
              <View style={styles.reviewMetaBadge}>
                <Ionicons name="location-outline" size={11} color="#a0a0b8" />
                <Text style={styles.reviewMetaBadgeText}>{location}</Text>
              </View>
            ) : null}
          </View>
          {description ? <Text style={styles.reviewDesc} numberOfLines={3}>{description}</Text> : null}
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewSectionTitle}>Pricing</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Starting Price</Text>
            <Text style={styles.reviewVal}>R{parseFloat(startingPrice || '0').toFixed(2)}</Text>
          </View>
          {useReserve && reservePrice && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Reserve Price</Text>
              <Text style={styles.reviewVal}>R{parseFloat(reservePrice).toFixed(2)}</Text>
            </View>
          )}
          {useBuyNow && buyNowPrice && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Buy Now Price</Text>
              <Text style={[styles.reviewVal, { color: '#f59e0b' }]}>R{parseFloat(buyNowPrice).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Auction Ends</Text>
            <Text style={styles.reviewVal}>{endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        {aiEstimate && (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewSectionTitle}>AI Estimate</Text>
            <Text style={styles.reviewAiVal}>
              R{Math.round(aiEstimate.sell_price_range?.low || aiEstimate.estimated_market_value_low || 0).toLocaleString('en-ZA')} – R{Math.round(aiEstimate.sell_price_range?.high || aiEstimate.estimated_market_value_high || 0).toLocaleString('en-ZA')}
            </Text>
          </View>
        )}

        <View style={styles.feeCard}>
          <Ionicons name="information-circle-outline" size={16} color="#a0a0b8" />
          <Text style={styles.reviewFee}>
            5% platform fee on final sale price. Funds held in escrow until delivery confirmed.
          </Text>
        </View>

        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
            <Ionicons name="arrow-back" size={18} color="#a0a0b8" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>🚀 List Item</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Step 5: Success
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrap}>
        <View style={styles.successIconInner}>
          <Text style={styles.successIcon}>🎉</Text>
        </View>
        <View style={styles.successIconRing} />
      </View>
      <Text style={styles.successTitle}>Listing Created!</Text>
      <Text style={styles.successSubtitle}>Your item is now live on BidTrust and ready to receive bids.</Text>

      <TouchableOpacity
        style={styles.viewListingBtn}
        onPress={() => {
          if (createdListingId) router.push(`/listing/${createdListingId}`);
        }}
      >
        <Ionicons name="eye-outline" size={18} color="#fff" />
        <Text style={styles.viewListingBtnText}>View Listing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.listAnotherBtn} onPress={resetForm}>
        <Ionicons name="add-circle-outline" size={18} color="#a0a0b8" />
        <Text style={styles.listAnotherBtnText}>List Another Item</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {renderProgressBar()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderSuccess()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  progressStep: {
    alignItems: 'center',
    width: 60,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#13131f',
    borderWidth: 1.5,
    borderColor: '#252538',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressDotActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  progressDotDone: {
    backgroundColor: '#13131f',
    borderColor: '#e94560',
    borderWidth: 1.5,
  },
  progressLabel: {
    color: '#4a4a6a',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  progressLabelActive: {
    color: '#e94560',
    fontWeight: '700',
  },
  progressLabelDone: {
    color: '#a0a0b8',
  },
  progressLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#252538',
    marginBottom: 18,
    marginHorizontal: -4,
  },
  progressLineActive: {
    backgroundColor: '#e94560',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f1f1',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#a0a0b8',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadZone: {
    borderWidth: 1.5,
    borderColor: '#252538',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#13131f',
  },
  uploadIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(233,69,96,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.2)',
  },
  uploadZoneTitle: {
    color: '#f1f1f1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadZoneSubtitle: {
    color: '#4a4a6a',
    fontSize: 13,
  },
  photoStrip: {
    marginBottom: 12,
  },
  photoStripContent: {
    gap: 8,
    paddingVertical: 4,
  },
  photoWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoThumb: {
    width: 100,
    height: 100,
    backgroundColor: '#1c1c2e',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#e94560',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#252538',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#13131f',
    gap: 4,
  },
  addMoreText: {
    color: '#4a4a6a',
    fontSize: 11,
    fontWeight: '600',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#252538',
    gap: 6,
  },
  photoActionBtnText: {
    color: '#a0a0b8',
    fontSize: 14,
    fontWeight: '600',
  },
  aiSection: {
    backgroundColor: '#13131f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  aiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  aiIconBadgeText: {
    color: '#f97316',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  aiHeaderText: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f1f1',
    marginBottom: 1,
  },
  aiSubtitle: {
    color: '#a0a0b8',
    fontSize: 12,
  },
  aiButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  aiBtn: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  aiBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  aiDescribeBtn: {
    flex: 1,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  aiDescribeBtnText: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '600',
  },
  aiErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(233,69,96,0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  aiError: {
    color: '#e94560',
    fontSize: 13,
    flex: 1,
  },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiHintText: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '600',
  },
  usePricesBtn: {
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.3)',
    borderRadius: 10,
    padding: 11,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  usePricesBtnText: {
    color: '#e94560',
    fontWeight: '700',
    fontSize: 14,
  },
  nextBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    color: '#a0a0b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 14,
    color: '#f1f1f1',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#252538',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#252538',
  },
  inputFlat: {
    flex: 1,
    color: '#f1f1f1',
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryGridItem: {
    width: (SCREEN_WIDTH - 56) / 3,
    backgroundColor: '#13131f',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252538',
    gap: 4,
  },
  categoryGridItemActive: {
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderColor: '#e94560',
  },
  categoryGridEmoji: {
    fontSize: 22,
  },
  categoryGridText: {
    color: '#a0a0b8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryGridTextActive: {
    color: '#e94560',
    fontWeight: '700',
  },
  conditionPillRow: {
    gap: 8,
    paddingVertical: 2,
  },
  conditionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#13131f',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#252538',
  },
  conditionPillActive: {
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderColor: '#e94560',
  },
  conditionPillEmoji: {
    fontSize: 14,
  },
  conditionPillText: {
    color: '#a0a0b8',
    fontSize: 13,
    fontWeight: '600',
  },
  conditionPillTextActive: {
    color: '#e94560',
    fontWeight: '700',
  },
  conditionDesc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#13131f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252538',
  },
  conditionDescText: {
    color: '#a0a0b8',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  largePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252538',
    overflow: 'hidden',
  },
  currencyBadge: {
    backgroundColor: '#1c1c2e',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRightWidth: 1,
    borderRightColor: '#252538',
  },
  currencyBadgeText: {
    color: '#f1f1f1',
    fontSize: 22,
    fontWeight: '900',
  },
  largePriceInput: {
    flex: 1,
    color: '#f1f1f1',
    fontSize: 28,
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingVertical: 14,
    letterSpacing: -0.5,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  currencySymbol: {
    color: '#f1f1f1',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#252538',
    marginBottom: 2,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1c1c2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252538',
  },
  toggleLabel: {
    color: '#f1f1f1',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleSubtext: {
    color: '#4a4a6a',
    fontSize: 12,
  },
  durationSegmented: {
    flexDirection: 'row',
    backgroundColor: '#13131f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252538',
    padding: 4,
    gap: 4,
  },
  durationSegmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  durationSegmentBtnActive: {
    backgroundColor: '#e94560',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  durationSegmentText: {
    color: '#4a4a6a',
    fontSize: 14,
    fontWeight: '700',
  },
  durationSegmentTextActive: {
    color: '#fff',
  },
  durationHint: {
    color: '#4a4a6a',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  backBtn: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252538',
    flexDirection: 'row',
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#a0a0b8',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  reviewPhotoStrip: {
    marginBottom: 16,
  },
  reviewPhotoWrap: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  reviewPhotoThumb: {
    width: 100,
    height: 80,
    backgroundColor: '#1c1c2e',
  },
  reviewPhotoPrimaryDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e94560',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  reviewCard: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252538',
  },
  reviewTitle: {
    color: '#f1f1f1',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reviewMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1c1c2e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#252538',
  },
  reviewMetaBadgeText: {
    color: '#a0a0b8',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewDesc: {
    color: '#a0a0b8',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 20,
  },
  reviewSectionTitle: {
    color: '#4a4a6a',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  reviewKey: {
    color: '#a0a0b8',
    fontSize: 14,
  },
  reviewVal: {
    color: '#f1f1f1',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewAiVal: {
    color: '#f97316',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  feeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#13131f',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252538',
  },
  reviewFee: {
    color: '#a0a0b8',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  successIconWrap: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  successIconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.1)',
  },
  successIcon: {
    fontSize: 44,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f1f1',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    color: '#a0a0b8',
    fontSize: 15,
    marginBottom: 36,
    textAlign: 'center',
    lineHeight: 22,
  },
  viewListingBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 15,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  viewListingBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  listAnotherBtn: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252538',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  listAnotherBtnText: {
    color: '#a0a0b8',
    fontSize: 16,
    fontWeight: '600',
  },
  qualifySection: {
    backgroundColor: '#0d0d14',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.15)',
    gap: 10,
  },
  qualifyTitle: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  qualifyField: {
    marginBottom: 6,
  },
  qualifyLabel: {
    color: '#a0a0b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  qualifyInput: {
    backgroundColor: '#13131f',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f1f1f1',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#252538',
  },
  qualifyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#252538',
    overflow: 'hidden',
  },
  qualifyCurrency: {
    color: '#f1f1f1',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1c1c2e',
    borderRightWidth: 1,
    borderRightColor: '#252538',
  },
  qualifyPriceInput: {
    flex: 1,
    color: '#f1f1f1',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
