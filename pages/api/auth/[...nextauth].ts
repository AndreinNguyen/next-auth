import NextAuth, { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";

import KeycloakProvider from "next-auth/providers/keycloak";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: "fitness-app",
      clientSecret: "SmeYEExCsyBLDcKfoAKVEg7VXnzB8vpe",
      issuer: "https://lab-ids.savvycom.xyz/realms/savvy-fitness",
      idToken: true,
    }),
  ],
  callbacks: {
    async jwt(data) {
      return data;
      // console.log({ token, user, account, profile });

      // // Initial sign in
      // if (account && user && profile) {
      //   return {
      //     accessToken: account.access_token,
      //     accessTokenExpires: account.expires_at * 1000,
      //     refreshToken: account.refresh_token,
      //     user,
      //     account,
      //   };
      // }

      // // Return previous token if the access token has not expired yet
      // if (Date.now() < token.accessTokenExpires) {
      //   console.log(token);
      //   return token;
      // }

      // // Access token has expired, try to update it
      // return refreshAccessToken(token);
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        // Return all data into user
        session.token = token;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
