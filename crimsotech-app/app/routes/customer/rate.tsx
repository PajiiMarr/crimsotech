// app/routes/rate.tsx
import type { Route } from './+types/rate';
import { useNavigate, useParams, data } from "react-router";
import { UserProvider } from '~/components/providers/user-role-provider';
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import AxiosInstance from '~/components/axios/Axios';
import { 
  AlertCircle, 
  RefreshCw,
  Star,
  ArrowLeft,
  CheckCircle,
  Package,
  Shield,
  Ruler,
  Box,
  Truck,
  User,
  Eye
} from "lucide-react";

// ================================
// Meta function - page title
// ================================
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Rate Your Order",
    },
  ];
}

// ================================
// Loader function
// ================================
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return data({ user }, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

// ================================
// Interfaces
// ================================
interface ProductImage {
  id: string;
  url: string;
  file_type: string;
}

interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  product_description?: string;
  variant_title?: string;
  quantity: number;
  price: string;
  primary_image?: ProductImage;
  product_images?: ProductImage[];
  can_review?: boolean;
}

interface RiderInfo {
  id: string;
  rider_id: string;
  name: string;
  vehicle_type?: string;
  plate_number?: string;
}

interface ReviewData {
  id: string;
  condition_rating: number;
  accuracy_rating: number;
  value_rating: number;
  delivery_rating: number;
  comment: string;
  created_at: string;
}

// ================================
// RatingStars Component
// ================================
function RatingStars({ 
  rating, 
  onRate,
  size = "md",
  readonly = false
}: { 
  rating: number; 
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRate?.(star)}
          disabled={readonly}
          className={`focus:outline-none transition-colors ${
            !readonly && 'hover:scale-110'
          }`}
        >
          <Star 
            className={`${sizeClasses[size]} ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ================================
// CriteriaCard Component
// ================================
function CriteriaCard({
  title,
  description,
  rating,
  onRate,
  Icon,
  readonly = false
}: {
  title: string;
  description: string;
  rating: number;
  onRate?: (rating: number) => void;
  Icon: any;
  readonly?: boolean;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start gap-3 mb-3">
        <Icon className="w-5 h-5 text-gray-500 mt-0.5" />   
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <RatingStars rating={rating} onRate={onRate} size="md" readonly={readonly} />
    </div>
  );
}

// ================================
// ViewReviewCard Component
// ================================
function ViewReviewCard({ review }: { review: ReviewData }) {
  return (
    <Card className="mb-4 border shadow-sm bg-green-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <CardTitle className="text-base font-medium text-green-700">
              You've already reviewed this order
            </CardTitle>
          </div>
          <Badge className="bg-green-100 text-green-700">
            Submitted {new Date(review.created_at).toLocaleDateString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Product Ratings */}
          <div>
            <h3 className="text-sm font-medium mb-3">Your Product Ratings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CriteriaCard
                title="Condition"
                description="Material durability and quality"
                rating={review.condition_rating}
                Icon={Shield}
                readonly={true}
              />
              <CriteriaCard
                title="Accuracy"
                description="Matches description, photos, and specifications"
                rating={review.accuracy_rating}
                Icon={Ruler}
                readonly={true}
              />
              <CriteriaCard
                title="Value"
                description="Value for money and worth"
                rating={review.value_rating}
                Icon={Box}
                readonly={true}
              />
            </div>
          </div>

          {/* Rider Rating */}
          <div>
            <h3 className="text-sm font-medium mb-3">Your Rider Rating</h3>
            <div className="grid grid-cols-1 gap-4">
              <CriteriaCard
                title="Delivery Experience"
                description="Rider's professionalism and handling"
                rating={review.delivery_rating}
                Icon={Truck}
                readonly={true}
              />
            </div>
          </div>

          {/* Comment */}
          {review.comment && (
            <div>
              <h3 className="text-sm font-medium mb-2">Your Comment</h3>
              <p className="text-sm text-gray-600 p-3 bg-white rounded-lg border">
                "{review.comment}"
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ================================
// RateContent Component
// ================================
function RateContent({ user }: { user: any }) {
  const navigate = useNavigate();
  const params = useParams();
  const orderId = params.orderId;
  const productId = params.productId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [currentItem, setCurrentItem] = useState<OrderItem | null>(null);
  const [riderInfo, setRiderInfo] = useState<RiderInfo | null>(null);
  const [existingReview, setExistingReview] = useState<ReviewData | null>(null);

  // Product ratings
  const [conditionRating, setConditionRating] = useState(0);
  const [accuracyRating, setAccuracyRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);

  // Rider rating (delivery_rating)
  const [deliveryRating, setDeliveryRating] = useState(0);

  // Comments
  const [comment, setComment] = useState('');

  // Review status
  const [hasReviewed, setHasReviewed] = useState(false);

  // Check if all criteria are rated
  const allRated = conditionRating > 0 && accuracyRating > 0 && valueRating > 0 && deliveryRating > 0;

  // ================================
  // Fetch Functions
  // ================================
  const fetchOrderDetails = async () => {
    try {
      setError(null);
      
      // Fetch order details to get product info
      const orderResponse = await AxiosInstance.get(`/purchases-buyer/${orderId}/view-order/`, {
        headers: {
          'X-User-Id': user.user_id
        }
      });
      
      if (orderResponse.data) {
        // Find the specific product in the order
        const product = orderResponse.data.items?.find(
          (item: OrderItem) => item.product_id === productId
        );
        if (product) {
          setCurrentItem(product);
        }
      }
      
      // Fetch rider info to get rider_id
      try {
        const riderResponse = await AxiosInstance.get(`/purchases-buyer/${orderId}/get-rider-info/`, {
          headers: {
            'X-User-Id': user.user_id
          }
        });
        
        if (riderResponse.data?.success && riderResponse.data?.riders?.length > 0) {
          const rider = riderResponse.data.riders[0];
          setRiderInfo({
            id: rider.id,
            rider_id: rider.rider_id,
            name: rider.user ? `${rider.user.first_name || ''} ${rider.user.last_name || ''}`.trim() : 'Rider',
            vehicle_type: 'Motorcycle',
            plate_number: 'N/A'
          });
        }
      } catch (riderErr) {
        console.log("No rider info available");
      }
      
      // Check existing reviews
      await checkExistingReviews();
      
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const checkExistingReviews = async () => {
    try {
      // Check if this product has been reviewed
      const reviewResponse = await AxiosInstance.get('/reviews/', {
        params: {
          product_id: productId,
          customer_id: user.user_id
        },
        headers: {
          'X-User-Id': user.user_id
        }
      });
      
      if (reviewResponse.data?.data?.reviews?.length > 0) {
        const review = reviewResponse.data.data.reviews[0];
        setHasReviewed(true);
        setExistingReview({
          id: review.id,
          condition_rating: review.condition_rating || 0,
          accuracy_rating: review.accuracy_rating || 0,
          value_rating: review.value_rating || 0,
          delivery_rating: review.delivery_rating || 0,
          comment: review.comment || '',
          created_at: review.created_at
        });
      }
      
    } catch (err) {
      console.error("Error checking reviews:", err);
    }
  };

  // ================================
  // Submit Function
  // ================================
  const handleSubmitReview = async () => {
    // Validate all ratings are provided
    if (!hasReviewed && !allRated) {
      setError("Please rate all criteria: Condition, Accuracy, Value, and Delivery");
      return;
    }

    if (!riderInfo?.rider_id) {
      setError("No rider information found for this order");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Submit ONE review with both product and rider
      const payload = {
        customer_id: user.user_id,
        product_id: productId,
        rider_id: riderInfo.rider_id,  // Include rider_id
        condition_rating: conditionRating,
        accuracy_rating: accuracyRating,
        value_rating: valueRating,
        delivery_rating: deliveryRating,  // This is the rider rating
        comment: comment
      };

      const response = await AxiosInstance.post('/reviews/', payload, {
        headers: {
          'X-User-Id': user.user_id
        }
      });

      setSubmitted(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/purchases', { 
          state: { 
            message: 'Thank you for your review!' 
          } 
        });
      }, 2000);

    } catch (err: any) {
      console.error("Error submitting review:", err);
      if (err.response) {
        setError(err.response.data?.message || JSON.stringify(err.response.data));
      } else {
        setError(err.message || "Failed to submit review");
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (orderId && productId) {
      fetchOrderDetails();
    }
  }, [orderId, productId]);

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-sm">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="w-full flex justify-center items-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-4">Your review has been submitted successfully.</p>
          <p className="text-sm text-gray-400">Redirecting to purchases page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rate Your Experience</h1>
          <p className="text-sm text-gray-500">
            Order #{orderId?.slice(0,8)} • {currentItem?.product_name || 'Product'}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Show existing review if already reviewed */}
      {hasReviewed && existingReview ? (
        <ViewReviewCard review={existingReview} />
      ) : (
        /* Product Review Card - Only show if not reviewed */
        <Card className="mb-4 border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                {currentItem?.primary_image?.url ? (
                  <img 
                    src={currentItem.primary_image.url} 
                    alt={currentItem.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-medium">{currentItem?.product_name || 'Product'}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Quantity: {currentItem?.quantity || 1}
                  {currentItem?.variant_title && ` • ${currentItem.variant_title}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Product Ratings Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Rate the Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CriteriaCard
                    title="Condition"
                    description="Material durability and quality"
                    rating={conditionRating}
                    onRate={setConditionRating}
                    Icon={Shield}
                  />
                  <CriteriaCard
                    title="Accuracy"
                    description="Matches description, photos, and specifications"
                    rating={accuracyRating}
                    onRate={setAccuracyRating}
                    Icon={Ruler}
                  />
                  <CriteriaCard
                    title="Value"
                    description="Value for money and worth"
                    rating={valueRating}
                    onRate={setValueRating}
                    Icon={Box}
                  />
                </div>
              </div>

              {/* Rider Ratings Section */}
              {riderInfo && (
                <div>
                  <h3 className="text-md font-medium mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Rate the Rider: {riderInfo.name}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <CriteriaCard
                      title="Delivery Experience"
                      description="Rider's professionalism and handling"
                      rating={deliveryRating}
                      onRate={setDeliveryRating}
                      Icon={Truck}
                    />
                  </div>
                </div>
              )}

              {/* Comment */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">Additional Comments (optional)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about the product and delivery experience..."
                  className="min-h-[100px] text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - Only show if not reviewed */}
      {!hasReviewed && (
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            size="default"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="px-4"
          >
            Cancel
          </Button>
          <Button
            size="default"
            onClick={handleSubmitReview}
            disabled={
              submitting || 
              !allRated ||
              !riderInfo?.rider_id
            }
            className="px-4 bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ================================
// Default component
// ================================
export default function Rate({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;
  
  return (
    <UserProvider user={user}>
      <RateContent user={user} />
    </UserProvider>
  );
}