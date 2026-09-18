"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortOrder = exports.PriceRange = exports.MaterialType = exports.PayoutStatus = exports.UserRole = exports.BookingStatus = exports.TransactionStatus = exports.KycStatus = exports.CourseStatus = void 0;
var CourseStatus;
(function (CourseStatus) {
    CourseStatus["DRAFT"] = "draft";
    CourseStatus["PUBLISHED"] = "published";
    CourseStatus["ARCHIVED"] = "archived";
})(CourseStatus || (exports.CourseStatus = CourseStatus = {}));
var KycStatus;
(function (KycStatus) {
    KycStatus["PENDING"] = "pending";
    KycStatus["SUBMITTED"] = "submitted";
    KycStatus["APPROVED"] = "approved";
    KycStatus["REJECTED"] = "rejected";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PAID"] = "paid";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["REFUNDED"] = "refunded";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["COMPLETED"] = "completed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["NO_SHOW"] = "no_show";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "student";
    UserRole["INSTRUCTOR"] = "instructor";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var PayoutStatus;
(function (PayoutStatus) {
    PayoutStatus["PENDING"] = "pending";
    PayoutStatus["PROCESSING"] = "processing";
    PayoutStatus["PAID"] = "paid";
    PayoutStatus["FAILED"] = "failed";
    PayoutStatus["REJECTED"] = "rejected";
})(PayoutStatus || (exports.PayoutStatus = PayoutStatus = {}));
var MaterialType;
(function (MaterialType) {
    MaterialType["PDF"] = "pdf";
    MaterialType["DOCUMENT"] = "document";
    MaterialType["LINK"] = "link";
    MaterialType["ZIP"] = "zip";
    MaterialType["IMAGE"] = "image";
    MaterialType["OTHER"] = "other";
})(MaterialType || (exports.MaterialType = MaterialType = {}));
var PriceRange;
(function (PriceRange) {
    PriceRange["FREE"] = "free";
    PriceRange["UNDER_500"] = "under500";
    PriceRange["BETWEEN_500_2000"] = "500to2000";
    PriceRange["OVER_2000"] = "over2000";
})(PriceRange || (exports.PriceRange = PriceRange = {}));
var SortOrder;
(function (SortOrder) {
    SortOrder["NEWEST"] = "newest";
    SortOrder["PRICE_ASC"] = "price_asc";
    SortOrder["PRICE_DESC"] = "price_desc";
    SortOrder["POPULAR"] = "popular";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
//# sourceMappingURL=index.js.map