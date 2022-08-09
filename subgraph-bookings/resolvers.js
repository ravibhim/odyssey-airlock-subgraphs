const { AuthenticationError, ForbiddenError } = require("apollo-server");
const authErrMessage = "*** you must be logged in ***";

const resolvers = {
  // TODO: fill in resolvers
  Query: {
    guestBookings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      if (userRole === "Guest") {
        const bookings = await dataSources.bookingsDb.getBookingsForUser(
          userId
        );
        return bookings;
      } else {
        throw new ForbiddenError("Only guests have access to trips");
      }
    },
    upcomingGuestBookings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      if (userRole === "Guest") {
        const bookings = await dataSources.bookingsDb.getBookingsForUser(
          userId,
          "UPCOMING"
        );
        return bookings;
      } else {
        throw new ForbiddenError("Only guests have access to trips");
      }
    },
    pastGuestBookings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      if (userRole === "Guest") {
        const bookings = await dataSources.bookingsDb.getBookingsForUser(
          userId,
          "COMPLETED"
        );
        return bookings;
      } else {
        throw new ForbiddenError("Only guests have access to trips");
      }
    },
    bookingsForListing: async (
      _,
      { listingId, status },
      { dataSources, userId, userRole }
    ) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      if (userRole === "Host") {
        // need to check if listing belongs to host
        const listings = await dataSources.listingsAPI.getListingsForUser(
          userId
        );
        if (listings.find((listing) => listing.id === listingId)) {
          const bookings =
            (await dataSources.bookingsDb.getBookingsForListing(
              listingId,
              status
            )) || [];
          return bookings;
        } else {
          throw new Error("Listing does not belong to host");
        }
      } else {
        throw new ForbiddenError("Only hosts have access to listing bookings");
      }
    },
  },
  Mutation: {
    createBooking: async (
      _,
      { createBookingInput },
      { dataSources, userId }
    ) => {
      if (!userId) throw new AuthenticationError(authErrMessage);

      const { listingId, checkInDate, checkOutDate } = createBookingInput;
      const { totalCost } = await dataSources.listingsAPI.getTotalCost({
        id: listingId,
        checkInDate,
        checkOutDate,
      });

      try {
        await dataSources.walletsAPI.subtractFunds({
          userId,
          amount: totalCost,
        });
      } catch (e) {
        return {
          code: 400,
          success: false,
          message:
            "We couldn’t complete your request because your funds are insufficient.",
        };
      }

      try {
        const booking = await dataSources.bookingsDb.createBooking({
          listingId,
          checkInDate,
          checkOutDate,
          totalCost,
          guestId: userId,
        });

        return {
          code: 200,
          success: true,
          message: "Successfully booked!",
          booking,
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
  Booking: {
    listing: ({ listingId }, _, { dataSources }) => {
      return dataSources.listingsAPI.getListing(listingId);
    },
    checkInDate: ({ checkInDate }, _, { dataSources }) => {
      return dataSources.bookingsDb.getHumanReadableDate(checkInDate);
    },
    checkOutDate: ({ checkOutDate }, _, { dataSources }) => {
      return dataSources.bookingsDb.getHumanReadableDate(checkOutDate);
    },
    guest: ({ guestId }) => {
      return { id: guestId };
    },
    totalPrice: async (
      { listingId, checkInDate, checkOutDate },
      _,
      { dataSources }
    ) => {
      const { totalCost } = await dataSources.listingsAPI.getTotalCost({
        id: listingId,
        checkInDate,
        checkOutDate,
      });
      return totalCost;
    },
  },
  Listing: {
    bookings: ({ id }, _, { dataSources }) => {
      return dataSources.bookingsDb.getBookingsForListing(id);
    },
  },
};

module.exports = resolvers;
