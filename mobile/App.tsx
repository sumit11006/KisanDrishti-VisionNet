import React, { useState, useEffect, createContext, useContext } from 'react';
import { StatusBar, Text, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// --- Contexts ---
type AuthContextType = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
};
export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
});

// --- Theme ---
const AgriTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50', // Green
    background: '#F1F8E9', // Light Green / Earthy
    card: '#ffffff',
    text: '#333333',
    border: '#A5D6A7',
    notification: '#FF5722',
  },
};

// --- Screens ---
import DiagnosticScanner from './src/components/DiagnosticScanner';
import RegenerativeDashboard from './src/components/RegenerativeDashboard';
import VoiceInterface from './src/components/VoiceInterface';
import BRICSDataShareModal from './src/components/BRICSDataShareModal';

// Wrap BRICS Modal in a view since it's a modal component
const BRICSScreen = () => {
  const [modalVisible, setModalVisible] = useState(true);
  return (
    <View style={styles.screen}>
      <BRICSDataShareModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      <Text style={{ marginTop: 20, textAlign: 'center', padding: 20 }}>
        Click the 'Share Data' button above to open the interoperability portal.
      </Text>
    </View>
  );
};

const SettingsScreen = () => <View style={styles.screen}><Text>Settings / Profile (To be implemented)</Text></View>;

// --- Offline Banner ---
const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);

  // Mock network check
  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate network toggle for demo
      // setIsOffline(prev => !prev);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>Offline Mode - Limited Functionality</Text>
    </View>
  );
};

// --- Navigator ---
const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'help';

          if (route.name === 'Diagnose') {
            iconName = focused ? 'leaf' : 'leaf-outline';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Advisory') {
            iconName = focused ? 'headphones' : 'headphones-box';
          } else if (route.name === 'BRICS') {
            iconName = focused ? 'earth' : 'earth-box';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return <Icon name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen name="Diagnose" component={DiagnosticScanner} />
      <Tab.Screen name="Dashboard" component={RegenerativeDashboard} />
      <Tab.Screen name="Advisory" component={VoiceInterface} />
      <Tab.Screen name="BRICS" component={BRICSScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// --- App Root ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [language, setLanguage] = useState('en');

  const authContext = {
    isAuthenticated,
    login: () => setIsAuthenticated(true),
    logout: () => setIsAuthenticated(false),
  };

  const langContext = {
    language,
    setLanguage,
  };

  return (
    <AuthContext.Provider value={authContext}>
      <LanguageContext.Provider value={langContext}>
        <View style={styles.container}>
          <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
          <OfflineBanner />
          <NavigationContainer theme={AgriTheme}>
            <MainNavigator />
          </NavigationContainer>
        </View>
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: '#F1F8E9',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    padding: 20,
  },
  offlineBanner: {
    backgroundColor: '#FF5252',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
