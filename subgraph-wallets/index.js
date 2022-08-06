const { ApolloServer, gql } = require("apollo-server");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { readFileSync } = require("fs");

const typeDefs = gql(readFileSync("./schema.graphql", { encoding: "utf-8" }));
const resolvers = require("./resolvers");
const WalletsAPI = require("./datasources/wallets");

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  dataSources: () => {
    return {
      walletsAPI: new WalletsAPI(),
    };
  },
  context: ({ req }) => {
    return { userId: req.headers.userid, userRole: req.headers.userrole };
  },
});

const port = 4003;
const subgraphName = "wallets";

server
  .listen({ port })
  .then(({ url }) => {
    console.log(`🚀 Subgraph ${subgraphName} running at ${url}`);
  })
  .catch((err) => {
    console.error(err);
  });
