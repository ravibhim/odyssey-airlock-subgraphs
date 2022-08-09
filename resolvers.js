const { AuthenticationError, ForbiddenError } = require("apollo-server");
const authErrMessage = "*** you must be logged in ***";

const resolvers = {
  Query: {
    searchListings: async (_, { criteria }, { dataSources }) => {
      const { numOfBeds, checkInDate, checkOutDate, page, limit, sortBy } =
        criteria;
      const listings = await dataSources.listingsAPI.getListings({
        numOfBeds,
        page,
        limit,
        sortBy,
      });

      // check availability for each listing
      const listingAvailability = await Promise.all(
        listings.map((listing) =>
          dataSources.bookingsDb.isListingAvailable({
            listingId: listing.id,
            checkInDate,
            checkOutDate,
          })
        )
      );

      // filter listings data based on availability
      const availableListings = listings.filter(
        (listing, index) => listingAvailability[index]
      );

      return availableListings;
    },
    hostListings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      if (userRole === "Host") {
        return dataSources.listingsAPI.getListingsForUser(userId);
      } else {
        throw new ForbiddenError("Only hosts have access to listings.");
      }
    },
    listing: (_, { id }, { dataSources }) => {
      return dataSources.listingsAPI.getListing(id);
    },
    featuredListings: (_, __, { dataSources }) => {
      const limit = 3;
      return dataSources.listingsAPI.getFeaturedListings(limit);
    },
    listingAmenities: (_, __, { dataSources }) => {
      return dataSources.listingsAPI.getAllAmenities();
    },
  },
  Mutation: {
    createListing: async (
      _,
      { listing },
      { dataSources, userId, userRole }
    ) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      const {
        title,
        description,
        photoThumbnail,
        numOfBeds,
        costPerNight,
        locationType,
        amenities,
      } = listing;

      if (userRole === "Host") {
        try {
          const newListing = await dataSources.listingsAPI.createListing({
            title,
            description,
            photoThumbnail,
            numOfBeds,
            costPerNight,
            hostId: userId,
            locationType,
            amenities,
          });

          return {
            code: 200,
            success: true,
            message: "Listing successfully created!",
            listing: newListing,
          };
        } catch (err) {
          return {
            code: 400,
            success: false,
            message: err.message,
          };
        }
      } else {
        return {
          code: 400,
          success: false,
          message: "Only hosts can create new listings",
        };
      }
    },
    updateListing: async (
      _,
      { listingId, listing },
      { dataSources, userId }
    ) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      try {
        const updatedListing = await dataSources.listingsAPI.updateListing({
          listingId,
          listing,
        });

        return {
          code: 200,
          success: true,
          message: "Listing successfully updated!",
          listing: updatedListing,
        };
      } catch (err) {
        return {
          code: 400,
          success: false,
          message: err.message,
        };
      }
    },
  },

  Host: {
    overallRating: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getOverallRatingForHost(id);
    },
  },
  Listing: {
    __resolveReference(listing, { dataSources }) {
      return dataSources.listingsAPI.getListing(listing.id);
    },
    host: ({ hostId }) => {
      return { id: hostId };
    },
    overallRating: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getOverallRatingForListing(id);
    },
    totalCost: async (
      { id },
      { checkInDate, checkOutDate },
      { dataSources }
    ) => {
      const { totalCost } = await dataSources.listingsAPI.getTotalCost({
        id,
        checkInDate,
        checkOutDate,
      });
      return totalCost;
    },
    currentlyBookedDates: ({ id }, _, { dataSources }) => {
      return dataSources.bookingsDb.getCurrentlyBookedDateRangesForListing(id);
    },

    numberOfUpcomingBookings: async ({ id }, _, { dataSources }) => {
      const bookings =
        (await dataSources.bookingsDb.getBookingsForListing(id, "UPCOMING")) ||
        [];
      return bookings.length;
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
  AmenityCategory: {
    ACCOMMODATION_DETAILS: "Accommodation Details",
    SPACE_SURVIVAL: "Space Survival",
    OUTDOORS: "Outdoors",
  },
};

module.exports = resolvers;
