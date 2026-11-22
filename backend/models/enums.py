from enum import Enum


class PropertyRequirement(str, Enum):
    BHK2 = "2 BHK Apartment"
    BHK3 = "3 BHK Apartment"
    INDEPENDENT_HOUSE = "Independent House"
    VILLA = "Villa"
    COMMERCIAL = "Commercial Property"
    PLOT = "Plot/Land"
    OTHER = "Other"


class BuyingTimeline(str, Enum):
    IMMEDIATELY = "Immediately"
    ONE_MONTH = "Within 1 Month"
    THREE_MONTHS = "Within 3 Months"
    SIX_MONTHS = "Within 6 Months"
    MORE_THAN_SIX = "More than 6 Months"
    EXPLORING = "Just Exploring"


class LeadStatus(str, Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    FOLLOW_UP_REQUIRED = "Follow-up Required"
    SITE_VISIT_SCHEDULED = "Site Visit Scheduled"
    NEGOTIATION = "Negotiation"
    CONVERTED = "Converted"
    LOST = "Lost"


class Priority(str, Enum):
    HOT = "Hot"
    WARM = "Warm"
    COLD = "Cold"


class CustomerIntent(str, Enum):
    READY_TO_PURCHASE = "Ready to purchase"
    ACTIVELY_RESEARCHING = "Actively researching"
    COMPARING = "Comparing properties"
    JUST_EXPLORING = "Just exploring"
    UNCLEAR = "Unclear"


class ConcernCategory(str, Enum):
    BUDGET = "Budget"
    LOCATION = "Location"
    FINANCING = "Financing"
    TIMING = "Timing"
    OTHER = "Other"


class FactorImpact(str, Enum):
    POSITIVE = "Positive"
    NEUTRAL = "Neutral"
    NEGATIVE = "Negative"


class Urgency(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class AnalysisStatus(str, Enum):
    NOT_ANALYZED = "not_analyzed"
    COMPLETED = "completed"
    FAILED = "failed"


class FollowUpStatus(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
