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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import api from '../../lib/api';
import AIEstimateCard from '../../components/AIEstimateCard';

const CATEGORIES = ['Electronics', 'Furniture', 'Clothing', 'Vehicles', 'Collectibles', 'Sports', 'Books', 'Other'];
const CONDITIONS = [
  { value: 'new', label: 'New', desc: 'Brand new, never used, in original packaging' },
  { value: 'like_new', label: 'Like New', desc: 'Used once or twice, no signs of wear' },
  { value: 'good', label: 'Good', desc: 'Light use, minor wear, fully functional' },
  { value: 'fair', label: 'Fair', desc: 'Moderate use, visible wear, functional' },
  { value: 'poor', label: 'Poor', desc: 'Heavy wear, may have defects' },
];

export default function SellScreen() {
  const [step, setStep] = useState(1);

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);

  // AI estimate state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<any>(null);
  const [aiError, setAiError] = useState('');

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

      const data = await api.postFormData<{ estimate: any }>('/ai/estimate', formData);
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
    setStartingPrice(String(aiEstimate.suggested_starting_price || ''));
    setBuyNowPrice(String(aiEstimate.suggested_buy_now_price || ''));
    setUseBuyNow(true);
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

  // Progress bar
  const renderProgressBar = () => {
    if (step > 4) return null;
    const steps = ['Photos', 'Details', 'Pricing', 'Review'];
    return (
      <View style={styles.progressContainer}>
        {steps.map((label, i) => (
          <React.Fragment key={i}>
            <View style={styles.progressStep}>
              <View style={[styles.progressDot, i + 1 <= step && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, i + 1 <= step && styles.progressDotTextActive]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.progressLabel, i + 1 === step && styles.progressLabelActive]}>
                {label}
              </Text>
            </View>
            {i < 3 && <View style={[styles.progressLine, i + 1 < step && styles.progressLineActive]} />}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Step 1: Photos & AI
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Add Photos</Text>
      <Text style={styles.stepSubtitle}>Up to 10 photos. First photo is the cover.</Text>

      {/* Photo grid */}
      <View style={styles.photoGrid}>
        {photos.map((uri, i) => (
          <View key={i} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photoThumb} />
            {i === 0 && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Cover</Text></View>}
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}>
              <Text style={styles.removePhotoBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {photos.length < 10 && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
            <Text style={styles.addPhotoBtnIcon}>+</Text>
            <Text style={styles.addPhotoBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.photoActionBtn} onPress={pickImages}>
          <Text style={styles.photoActionBtnText}>📷 Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoActionBtn} onPress={takePhoto}>
          <Text style={styles.photoActionBtnText}>📸 Camera</Text>
        </TouchableOpacity>
      </View>

      {/* AI Section */}
      {photos.length > 0 && (
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiTitle}>✨ AI Valuation</Text>
            <Text style={styles.aiSubtitle}>Let AI estimate your item's market value</Text>
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
                <Text style={styles.aiBtnText}>Get AI Estimate</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aiDescribeBtn, aiLoading && styles.btnDisabled]}
              onPress={runAIDescribe}
              disabled={aiLoading}
            >
              <Text style={styles.aiDescribeBtnText}>Auto-fill Details</Text>
            </TouchableOpacity>
          </View>

          {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}

          {aiEstimate && (
            <>
              <AIEstimateCard estimate={aiEstimate} />
              <TouchableOpacity style={styles.usePricesBtn} onPress={useSuggestedPrices}>
                <Text style={styles.usePricesBtnText}>Use Suggested Prices →</Text>
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
        <Text style={styles.nextBtnText}>Next: Item Details →</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 2: Item details
  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Item Details</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Apple MacBook Pro 2021 M1"
          placeholderTextColor="#666"
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
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          maxLength={2000}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Category *</Text>
        <View style={styles.optionGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.optionBtn, category === cat && styles.optionBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.optionBtnText, category === cat && styles.optionBtnTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Condition *</Text>
        {CONDITIONS.map(cond => (
          <TouchableOpacity
            key={cond.value}
            style={[styles.conditionBtn, condition === cond.value && styles.conditionBtnActive]}
            onPress={() => setCondition(cond.value)}
          >
            <View>
              <Text style={[styles.conditionLabel, condition === cond.value && styles.conditionLabelActive]}>
                {cond.label}
              </Text>
              <Text style={styles.conditionDesc}>{cond.desc}</Text>
            </View>
            {condition === cond.value && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="City, State"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { flex: 1 }, (!title || !category || !condition) && styles.btnDisabled]}
          onPress={() => setStep(3)}
          disabled={!title || !category || !condition}
        >
          <Text style={styles.nextBtnText}>Next: Pricing →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 3: Pricing
  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Pricing & Auction</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Starting Price *</Text>
        <View style={styles.priceInputRow}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={[styles.input, styles.priceInput]}
            value={startingPrice}
            onChangeText={setStartingPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.label}>Reserve Price</Text>
            <Text style={styles.toggleSubtext}>Minimum acceptable winning bid</Text>
          </View>
          <Switch
            value={useReserve}
            onValueChange={setUseReserve}
            trackColor={{ false: '#333', true: '#e94560' }}
            thumbColor="#fff"
          />
        </View>
        {useReserve && (
          <View style={styles.priceInputRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={reservePrice}
              onChangeText={setReservePrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#666"
            />
          </View>
        )}
      </View>

      <View style={styles.field}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.label}>Buy Now Price</Text>
            <Text style={styles.toggleSubtext}>Allow instant purchase</Text>
          </View>
          <Switch
            value={useBuyNow}
            onValueChange={setUseBuyNow}
            trackColor={{ false: '#333', true: '#e94560' }}
            thumbColor="#fff"
          />
        </View>
        {useBuyNow && (
          <View style={styles.priceInputRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={buyNowPrice}
              onChangeText={setBuyNowPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#666"
            />
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Auction Duration</Text>
        <View style={styles.durationRow}>
          <View style={styles.durationInput}>
            <TextInput
              style={styles.input}
              value={auctionDays}
              onChangeText={setAuctionDays}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.durationLabel}>Days</Text>
          </View>
          <View style={styles.durationInput}>
            <TextInput
              style={styles.input}
              value={auctionHours}
              onChangeText={setAuctionHours}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.durationLabel}>Hours</Text>
          </View>
        </View>
        <Text style={styles.durationHint}>Min 1 hour, max 14 days</Text>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { flex: 1 }, !startingPrice && styles.btnDisabled]}
          onPress={() => setStep(4)}
          disabled={!startingPrice}
        >
          <Text style={styles.nextBtnText}>Next: Review →</Text>
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

        {photos.length > 0 && (
          <Image source={{ uri: photos[0] }} style={styles.reviewImage} />
        )}

        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>{title}</Text>
          <Text style={styles.reviewMeta}>{category} · {CONDITIONS.find(c => c.value === condition)?.label}</Text>
          {location ? <Text style={styles.reviewMeta}>📍 {location}</Text> : null}
          {description ? <Text style={styles.reviewDesc} numberOfLines={3}>{description}</Text> : null}
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewSectionTitle}>Pricing</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Starting Price</Text>
            <Text style={styles.reviewVal}>${parseFloat(startingPrice || '0').toFixed(2)}</Text>
          </View>
          {useReserve && reservePrice && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Reserve Price</Text>
              <Text style={styles.reviewVal}>${parseFloat(reservePrice).toFixed(2)}</Text>
            </View>
          )}
          {useBuyNow && buyNowPrice && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Buy Now Price</Text>
              <Text style={styles.reviewVal}>${parseFloat(buyNowPrice).toFixed(2)}</Text>
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
              ${aiEstimate.estimated_market_value_low} – ${aiEstimate.estimated_market_value_high}
            </Text>
          </View>
        )}

        <Text style={styles.reviewFee}>
          Platform fee: 5% of final sale price. Funds held in escrow until delivery confirmed.
        </Text>

        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>List Item ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Step 5: Success
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <Text style={styles.successIcon}>🎉</Text>
      <Text style={styles.successTitle}>Listing Created!</Text>
      <Text style={styles.successSubtitle}>Your item is now live on BidTrust</Text>

      <TouchableOpacity
        style={styles.viewListingBtn}
        onPress={() => {
          if (createdListingId) router.push(`/listing/${createdListingId}`);
        }}
      >
        <Text style={styles.viewListingBtnText}>View Listing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.listAnotherBtn} onPress={resetForm}>
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
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  progressStep: {
    alignItems: 'center',
    width: 56,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  progressDotText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '700',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLabel: {
    color: '#555',
    fontSize: 10,
  },
  progressLabelActive: {
    color: '#e94560',
    fontWeight: '600',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  progressLineActive: {
    backgroundColor: '#e94560',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#16213e',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#e94560',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoBtnText: {
    color: '#fff',
    fontSize: 11,
  },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtnIcon: {
    color: '#555',
    fontSize: 24,
  },
  addPhotoBtnText: {
    color: '#555',
    fontSize: 11,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  photoActionBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  aiSection: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.3)',
  },
  aiHeader: {
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  aiSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  aiButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  aiBtn: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  aiBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  aiDescribeBtn: {
    flex: 1,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e4a7a',
  },
  aiDescribeBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  aiError: {
    color: '#e94560',
    fontSize: 13,
    marginBottom: 8,
  },
  usePricesBtn: {
    backgroundColor: 'rgba(233,69,96,0.15)',
    borderWidth: 1,
    borderColor: '#e94560',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  usePricesBtnText: {
    color: '#e94560',
    fontWeight: '600',
    fontSize: 14,
  },
  nextBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
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
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 13,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  optionBtnActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  optionBtnText: {
    color: '#aaa',
    fontSize: 13,
  },
  optionBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  conditionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  conditionBtnActive: {
    borderColor: '#e94560',
    backgroundColor: 'rgba(233,69,96,0.1)',
  },
  conditionLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  conditionLabelActive: {
    color: '#e94560',
  },
  conditionDesc: {
    color: '#666',
    fontSize: 12,
  },
  checkmark: {
    color: '#e94560',
    fontSize: 18,
    fontWeight: '700',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  toggleSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationInput: {
    flex: 1,
    alignItems: 'center',
  },
  durationLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  durationHint: {
    color: '#555',
    fontSize: 11,
    marginTop: 4,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  backBtn: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 80,
  },
  backBtnText: {
    color: '#aaa',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#16213e',
  },
  reviewCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewMeta: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  reviewDesc: {
    color: '#bbb',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  reviewSectionTitle: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewKey: {
    color: '#888',
    fontSize: 14,
  },
  reviewVal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewAiVal: {
    color: '#e94560',
    fontSize: 20,
    fontWeight: '700',
  },
  reviewFee: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtitle: {
    color: '#888',
    fontSize: 15,
    marginBottom: 32,
  },
  viewListingBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  viewListingBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  listAnotherBtn: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  listAnotherBtnText: {
    color: '#aaa',
    fontSize: 16,
  },
});
