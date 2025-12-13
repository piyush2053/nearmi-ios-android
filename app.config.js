import "dotenv/config";

export default {
  expo: {
    name: "nearwe",
    slug: "nearwe",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "nearwe",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.pp2053.nearwe",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      softwareKeyboardLayoutMode: "pan",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.pp2053.nearwe",

      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/logo-removebg.png",
        backgroundImage: "./assets/images/logo-removebg.png",
        monochromeImage: "./assets/images/logo-removebg.png",
      },

      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/logo.png",
          color: "#ffffff",
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    assetBundlePatterns: ["**/*"],

    extra: {
      apiUrl: process.env.API_URL, 
      eas: {
        projectId: "53a3ee80-8ff5-4c16-ac84-c5accafc4000",
      },
      router: {},
    },
  },
};
