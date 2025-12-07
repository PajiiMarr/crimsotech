"use client";

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import Breadcrumbs from '~/components/ui/breadcrumbs';
import { 
  ArrowLeft, 
  Star, 
  Image, 
  Upload, 
  X, 
  CheckCircle, 
  Package,
  ThumbsUp,
  ThumbsDown,
  Shield,
  AlertCircle,
  Truck,
  Clock,
  User,
  ShieldCheck,
  PackageCheck
} from "lucide-react";

// --- Helper Functions ---
const formatCurrency = (amount: number): string => {
  return `₱ ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Star Rating Component
const StarRating = ({ 
  rating, 
  onRatingChange,
  size = "md",
  disabled = false
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9"
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange && onRatingChange(star)}
          className={`transition-transform ${!disabled ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
          disabled={disabled || !onRatingChange}
        >
          <Star className={`${sizeClasses[size]} ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-gray-700">
        {rating.toFixed(1)}/5.0
      </span>
    </div>
  );
};

// Review Guidelines Component
const ReviewGuidelines = () => (
  <Card className="border-blue-100 bg-blue-50">
    <CardContent className="pt-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Review Guidelines</h3>
        </div>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Be honest and specific about your experience</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Focus on the product and delivery experience</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Upload photos to help other buyers make informed decisions</span>
          </li>
          <li className="flex items-start gap-2">
            <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <span>Avoid personal information, offensive language, or fake reviews</span>
          </li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

// Image Upload Component
const ImageUpload = ({ 
  images, 
  onImageUpload, 
  onImageRemove,
  label,
  maxImages = 5
}: { 
  images: string[];
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: (index: number) => void;
  label: string;
  maxImages?: number;
}) => (
  <div className="space-y-3">
    <Label className="flex items-center gap-2">
      <Image className="w-4 h-4" />
      {label}
      <span className="text-xs text-gray-500">Max {maxImages} images, 5MB each</span>
    </Label>
    
    <div className="flex flex-wrap gap-3">
      {/* Upload Button */}
      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onImageUpload}
          className="hidden"
          disabled={images.length >= maxImages}
        />
        <div className={`w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center ${images.length >= maxImages ? 'text-gray-400' : 'text-gray-500 hover:border-blue-500 hover:text-blue-500'} transition-colors`}>
          <Upload className="w-6 h-6 mb-1" />
          <span className="text-xs">Add Photo</span>
          <span className="text-xs">{images.length}/{maxImages}</span>
        </div>
      </label>

      {/* Preview Images */}
      {images.map((image, index) => (
        <div key={index} className="relative group">
          <img
            src={image}
            alt={`Preview ${index + 1}`}
            className="w-24 h-24 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={() => onImageRemove(index)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// Aspect Rating Component
const AspectRating = ({ 
  label, 
  value, 
  onChange,
  icon: Icon
}: { 
  label: string; 
  value: number; 
  onChange: (value: number) => void;
  icon: React.ElementType;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-600" />
      <Label className="text-sm font-medium">{label}</Label>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">Poor</span>
      <StarRating 
        rating={value} 
        onRatingChange={onChange}
        size="sm"
      />
      <span className="text-xs text-gray-500">Excellent</span>
    </div>
  </div>
);

// Main Component
export default function ProductReview() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Product review states
  const [overallRating, setOverallRating] = useState(0);
  const [aspectRatings, setAspectRatings] = useState({
    quality: 0,
    accuracy: 0,
    value: 0,
  });
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<string>('yes');
  
  // Delivery review states
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [deliveryAspectRatings, setDeliveryAspectRatings] = useState({
    timeliness: 0,
    condition: 0,
    courtesy: 0,
  });
  const [deliveryReview, setDeliveryReview] = useState('');
  const [deliveryImages, setDeliveryImages] = useState<string[]>([]);
  
  // Common states
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock product data
  const productData = {
    id: id || "1",
    name: "Sneakers INVERNI BW",
    brand: "Sneakers",
    variant: "Black | Size: 44",
    price: 449000,
    orderId: "TXNID983274",
    orderDate: "2020-11-20",
    deliveryDate: "2020-11-26",
    shopName: "Double CTRL Z",
    courier: "LBC Express",
    riderName: "Juan Dela Cruz",
    deliveryTime: "15:30",
    image: "/public/phon.jpg",
  };

  // Calculate overall rating from aspect ratings
  useEffect(() => {
    const productAspects = Object.values(aspectRatings);
    const deliveryAspects = Object.values(deliveryAspectRatings);
    
    if (productAspects.every(r => r > 0) && deliveryAspects.every(r => r > 0)) {
      const productAvg = productAspects.reduce((a, b) => a + b, 0) / productAspects.length;
      const deliveryAvg = deliveryAspects.reduce((a, b) => a + b, 0) / deliveryAspects.length;
      const calculatedOverall = (productAvg * 0.7 + deliveryAvg * 0.3); // Weighted average
      setOverallRating(Math.round(calculatedOverall * 10) / 10);
    }
  }, [aspectRatings, deliveryAspectRatings]);

  const handleImageUpload = (images: string[], setImages: React.Dispatch<React.SetStateAction<string[]>>, maxImages: number) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && images.length + files.length <= maxImages) {
        const newImages = Array.from(files).map(file => URL.createObjectURL(file));
        setImages([...images, ...newImages]);
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Calculate final ratings
    const productAspects = Object.values(aspectRatings);
    const deliveryAspects = Object.values(deliveryAspectRatings);
    
    const productRating = productAspects.reduce((a, b) => a + b, 0) / productAspects.length;
    const deliveryRating = deliveryAspects.reduce((a, b) => a + b, 0) / deliveryAspects.length;
    
    // Simulate API call
    setTimeout(() => {
      console.log('Review submitted:', {
        productReview: {
          overallRating,
          productRating: productRating.toFixed(1),
          title,
          review,
          productImages,
          recommend,
          aspectRatings,
        },
        deliveryReview: {
          deliveryRating: deliveryRating.toFixed(1),
          deliveryReview,
          deliveryImages,
          deliveryAspectRatings,
        },
        common: {
          isAnonymous,
          productId: productData.id,
          orderId: productData.orderId,
        }
      });
      setIsSubmitting(false);
      navigate(-1); // Go back to previous page
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 px-0 hover:bg-transparent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="font-semibold">Back to Order</span>
        </Button>
        <Breadcrumbs />
      </div>
      
      <Separator />

      {/* Main Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Rate Your Purchase & Delivery</CardTitle>
          <CardDescription>
            Share your experience with the product and delivery service
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8">
            {/* Order Info */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{productData.name}</h3>
                  <p className="text-sm text-gray-600">{productData.brand} • {productData.variant}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Order: {productData.orderId}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Shop: {productData.shopName}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(productData.price)}</p>
                  <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                    Delivered {formatDate(productData.deliveryDate)}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-medium">Courier: {productData.courier}</p>
                    <p className="text-gray-600">Rider: {productData.riderName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium">Delivery Time</p>
                    <p className="text-gray-600">{productData.deliveryTime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* PRODUCT REVIEW SECTION */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold">Product Review</h3>
              </div>

              {/* Product Aspect Ratings */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Rate the Product</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AspectRating
                    label="Quality"
                    value={aspectRatings.quality}
                    onChange={(value) => setAspectRatings(prev => ({ ...prev, quality: value }))}
                    icon={ShieldCheck}
                  />
                  <AspectRating
                    label="Accuracy"
                    value={aspectRatings.accuracy}
                    onChange={(value) => setAspectRatings(prev => ({ ...prev, accuracy: value }))}
                    icon={CheckCircle}
                  />
                  <AspectRating
                    label="Value"
                    value={aspectRatings.value}
                    onChange={(value) => setAspectRatings(prev => ({ ...prev, value: value }))}
                    icon={PackageCheck}
                  />
                </div>
              </div>

              {/* Product Review Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-lg font-semibold">Review Title *</Label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your product experience"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="review" className="text-lg font-semibold">Product Review *</Label>
                  <Textarea
                    id="review"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="What did you like or dislike about the product? Was it as described?"
                    className="min-h-[120px] mt-2"
                    required
                  />
                </div>

                {/* Product Photos */}
                <ImageUpload
                  images={productImages}
                  onImageUpload={handleImageUpload(productImages, setProductImages, 5)}
                  onImageRemove={(index) => setProductImages(productImages.filter((_, i) => i !== index))}
                  label="Product Photos (Optional)"
                />

                {/* Product Recommendation */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Would you recommend this product? *
                  </Label>
                  <RadioGroup
                    value={recommend}
                    onValueChange={setRecommend}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="recommend-yes" />
                      <Label htmlFor="recommend-yes" className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                        Yes, I recommend
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="recommend-no" />
                      <Label htmlFor="recommend-no" className="flex items-center gap-2">
                        <ThumbsDown className="w-4 h-4 text-red-500" />
                        No, I don't recommend
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <Separator />

            {/* DELIVERY REVIEW SECTION */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Truck className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold">Delivery Review</h3>
              </div>

              {/* Delivery Aspect Ratings */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Rate the Delivery Service</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AspectRating
                    label="Timeliness"
                    value={deliveryAspectRatings.timeliness}
                    onChange={(value) => setDeliveryAspectRatings(prev => ({ ...prev, timeliness: value }))}
                    icon={Clock}
                  />
                  <AspectRating
                    label="Condition"
                    value={deliveryAspectRatings.condition}
                    onChange={(value) => setDeliveryAspectRatings(prev => ({ ...prev, condition: value }))}
                    icon={Package}
                  />
                  <AspectRating
                    label="Courtesy"
                    value={deliveryAspectRatings.courtesy}
                    onChange={(value) => setDeliveryAspectRatings(prev => ({ ...prev, courtesy: value }))}
                    icon={User}
                  />
                </div>
              </div>

              {/* Delivery Review Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deliveryReview" className="text-lg font-semibold">Delivery Experience *</Label>
                  <Textarea
                    id="deliveryReview"
                    value={deliveryReview}
                    onChange={(e) => setDeliveryReview(e.target.value)}
                    placeholder="How was your delivery experience? Was the rider professional? Was the package in good condition?"
                    className="min-h-[120px] mt-2"
                    required
                  />
                </div>

                {/* Delivery Photos */}
                <ImageUpload
                  images={deliveryImages}
                  onImageUpload={handleImageUpload(deliveryImages, setDeliveryImages, 3)}
                  onImageRemove={(index) => setDeliveryImages(deliveryImages.filter((_, i) => i !== index))}
                  label="Delivery Photos (Optional - e.g., package condition)"
                  maxImages={3}
                />
              </div>
            </div>

            <Separator />

            {/* OVERALL RATING */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <h3 className="text-xl font-semibold">Overall Rating</h3>
              </div>
              
              <div className="p-6 bg-gray-50 rounded-lg">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Calculated Overall Rating</p>
                    <div className="flex flex-col items-center">
                      <StarRating 
                        rating={overallRating} 
                        size="lg"
                        disabled
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        (Based on 70% product rating + 30% delivery rating)
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Product Rating</p>
                      <StarRating 
                        rating={Object.values(aspectRatings).reduce((a, b) => a + b, 0) / 3 || 0}
                        size="md"
                        disabled
                      />
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Delivery Rating</p>
                      <StarRating 
                        rating={Object.values(deliveryAspectRatings).reduce((a, b) => a + b, 0) / 3 || 0}
                        size="md"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Anonymous Review */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-500" />
                <div>
                  <Label htmlFor="anonymous" className="font-medium">Post as Anonymous</Label>
                  <p className="text-sm text-gray-600">Your name won't be shown on the review</p>
                </div>
              </div>
              <input
                id="anonymous"
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            {/* Review Guidelines */}
            <ReviewGuidelines />
          </CardContent>

          <CardFooter className="flex-col gap-4 pt-6">
            <div className="text-sm text-gray-600">
              <p>By submitting this review, you agree to our review guidelines.</p>
              <p>Your review will be visible to other shoppers, the seller, and the courier.</p>
            </div>
            
            <div className="flex gap-4 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting || 
                  Object.values(aspectRatings).some(r => r === 0) ||
                  Object.values(deliveryAspectRatings).some(r => r === 0) ||
                  !title || 
                  !review || 
                  !deliveryReview}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}