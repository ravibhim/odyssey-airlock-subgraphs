const { AuthenticationError, ForbiddenError } = require("apollo-server");
const authErrMessage = "*** you must be logged in ***";

const resolvers = {
  // TODO: fill in resolvers
  Query: {
    example: () => "Hello World!",
  },
  Mutation: {
    addFundsToWallet: async (_, { amount }, { dataSources, userId }) => {
      if (!userId) throw new AuthenticationError(authErrMessage);
      try {
        const updatedWallet = await dataSources.walletsAPI.addFunds({
          userId,
          amount,
        });
        return {
          code: 200,
          success: true,
          message: "Successfully added funds to wallet",
          amount: updatedWallet.amount,
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
  Guest: {
    funds: async (_, __, { dataSources, userId }) => {
      const { amount } = await dataSources.walletsAPI.getUserWalletAmount(
        userId
      );
      return amount;
    },
  },
};

module.exports = resolvers;
