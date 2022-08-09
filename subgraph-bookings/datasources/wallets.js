// TODO: rename file and add datasource code here

const { RESTDataSource } = require("apollo-datasource-rest");

class WalletsAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://rt-airlock-services-payments.herokuapp.com/";
  }

  getUserWalletAmount(userId) {
    return this.get(`wallet/${userId}`);
  }

  addFunds({ userId, amount }) {
    return this.patch(`wallet/${userId}/add`, { amount });
  }

  subtractFunds({ userId, amount }) {
    return this.patch(`wallet/${userId}/subtract`, { amount });
  }
}

module.exports = WalletsAPI;
