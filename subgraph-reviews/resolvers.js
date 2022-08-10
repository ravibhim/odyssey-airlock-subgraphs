const { AuthenticationError, ForbiddenError } = require("apollo-server");
const authErrMessage = "*** you must be logged in ***";

const resolvers = {
  Mutation: {
    submitGuestReview: async (
      _,
      { bookingId, guestReview },
      { dataSources, userId }
    ) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      // Validate if the current user is the host of the booking's Listing
      const booking = await dataSources.bookingsDb.getBooking(bookingId);
      const listing = await dataSources.listingsAPI.getListing(
        booking.dataValues.listingId
      );

      if (listing.hostId !== userId)
        throw new ForbiddenError(
          "Current user is not the host of the booking."
        );

      const { rating, text } = guestReview;
      const guestId = booking.dataValues.guestId;

      const createdReview = await dataSources.reviewsDb.createReviewForGuest({
        bookingId,
        guestId,
        authorId: userId,
        text,
        rating,
      });
      return {
        code: 200,
        success: true,
        message: "Successfully submitted review for guest",
        guestReview: createdReview,
      };
    },
    submitHostAndLocationReviews: async (
      _,
      { bookingId, hostReview, locationReview },
      { dataSources, userId }
    ) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      // Validate if the current user is the guest of the booking's Listing
      const booking = await dataSources.bookingsDb.getBooking(bookingId);

      if (booking.dataValues.guestId !== userId)
        throw new ForbiddenError(
          "Current user is not the guest of the booking."
        );
      const listing = await dataSources.listingsAPI.getListing(
        booking.dataValues.listingId
      );

      const createdLocationReview =
        await dataSources.reviewsDb.createReviewForListing({
          bookingId,
          listingId: listing.id,
          authorId: userId,
          text: locationReview.text,
          rating: locationReview.rating,
        });

      const createdHostReview = await dataSources.reviewsDb.createReviewForHost(
        {
          bookingId,
          hostId: listing.hostId,
          authorId: userId,
          text: hostReview.text,
          rating: hostReview.rating,
        }
      );

      return {
        code: 200,
        success: true,
        message: "Successfully submitted review for host and location",
        hostReview: createdHostReview,
        locationReview: createdLocationReview,
      };
    },
  },

  Host: {
    overallRating: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getOverallRatingForHost(id);
    },
  },
  Listing: {
    reviews: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewsForListing(id);
    },
  },
  Review: {
    author: (review) => {
      let role = "";
      if (review.targetType === "LISTING" || review.targetType === "HOST") {
        role = "Guest";
      } else {
        role = "Host";
      }
      return { __typename: role, id: review.authorId };
    },
  },
  Booking: {
    guestReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewForBooking("GUEST", id);
    },
    hostReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewForBooking("HOST", id);
    },
    locationReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewForBooking("LISTING", id);
    },
  },
};

module.exports = resolvers;
