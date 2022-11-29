import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import KeycloakProvider from "next-auth/providers/keycloak";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    error: string;
    user: {
      familyName?: string;
      emailVerified?: boolean;
      givenName?: string;
      id?: string;
      id_token?: string;
    } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    user: {
      familyName?: string;
      emailVerified?: boolean;
      givenName?: string;
      id?: string;
      id_token?: string;
    } & DefaultSession["user"];
    account: any;
    profile: any;
    accessToken: string;
    error: string;
    refreshTokenExpired: number;
    refreshToken: string;
  }
}

async function refreshAccessToken(token: JWT) {
  console.log("⭕️⭕️ run in refreshAccessToken");

  try {
    if (Date.now() > token.refreshTokenExpired) throw Error;
    const details = {
      client_id: process.env.NX_NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
      client_secret: "SmeYEExCsyBLDcKfoAKVEg7VXnzB8vpe",
      grant_type: ["refresh_token"],
      refresh_token: token.refreshToken,
    };
    const formBody: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.entries(details).forEach(([key, value]: [string, any]) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(value);
      formBody.push(encodedKey + "=" + encodedValue);
    });
    const formData = formBody.join("&");
    const url = `https://lab-ids.savvycom.xyz/realms/savvy-fitness/protocol/openid-connect/token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: formData,
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      refreshTokenExpired:
        Date.now() + refreshedTokens.refresh_expires_in * 1000,
    };
  } catch (error) {
    console.log("error", error);
    let ErrMessage;
    switch (error) {
      case "invalid_grant":
        ErrMessage = "SessionNotActive";
        break;

      default:
        ErrMessage = "RefreshAccessTokenError";
        break;
    }
    return {
      ...token,
      error: ErrMessage,
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: `fitness-app`,
      clientSecret: `SmeYEExCsyBLDcKfoAKVEg7VXnzB8vpe`,
      issuer: `https://lab-ids.savvycom.xyz/realms/savvy-fitness`,
      idToken: true,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // console.log(`😢😢😢account`, account);

      // return token;

      // Initial sign

      if (account) {
        console.log("✅✅✅ if (account && user && profile) === true");

        console.log(`😢😢😢 account`, account);
        console.log(`📅📅📅📅 Date.now`);
        console.log(Date.now());
        console.log(
          `😢😢😢 token.accessTokenExpires`,
          account.expires_at * 1000
        );

        console.log(
          `😢😢😢 Date.now() < token.accessTokenExpires`,
          Date.now() < account.expires_at * 1000
        );

        user.familyName = profile.family_name;
        user.givenName = profile.given_name;
        user.emailVerified = profile.email_verified;
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at * 1000,
          refreshToken: account.refresh_token,
          user,
          account,
        };
      }

      // console.log(`😢😢😢 account`, account);
      // console.log(`📅📅📅📅 Date.now`);
      // console.log(Date.now());
      // console.log(`😢😢😢 token.accessTokenExpires`, token.accessTokenExpires);
      console.log(
        `😢😢😢 Date.now() < token.accessTokenExpires`,
        Date.now() < token.accessTokenExpires
      );

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        console.log(
          "😀😀😀 if (Date.now() < token.accessTokenExpires) === true"
        );
        return token;
      }

      // Access token has expired, try to update it
      // return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token) {
        // Return all data into user
        session.user = { ...token.user, ...token.account, ...token.profile };
        session.accessToken = token.accessToken;
        session.error = token.error;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      // split from callbackUrl {'signOut?idToken'}
      const urlSplit = url.split("?");
      const idToken = urlSplit[1];
      // This is the beef:
      if (urlSplit[0] === "signOut") {
        const ssoLogoutUrl = `https://lab-ids.savvycom.xyz/realms/savvy-fitness/protocol/openid-connect/logout`;
        const redirectUrl = "https://lab-fitness.savvycom.xyz";
        const signOutWithRedirectUrl = `${ssoLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(
          redirectUrl
        )}&id_token_hint=${idToken}`;
        return signOutWithRedirectUrl;
      }
      // Allows relative callback URLs
      if (url.startsWith("/")) return new URL(url, baseUrl).toString();
      return baseUrl;
    },
  },
};
export default NextAuth(authOptions);
