import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import Geolocation from 'react-native-geolocation-service';
import SignatureCanvas from 'react-native-signature-canvas';
import QRCode from 'react-native-qrcode-svg';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

const API_URL = 'http://localhost:3000';

// ============= HOOKS PERSONALIZADOS =============
const useLocalStorage = (key, defaultValue) => {
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    AsyncStorage.getItem(key).then((stored) => {
      if (stored) setState(JSON.parse(stored));
    });
  }, [key]);

  const setValue = (value) => {
    setState(value);
    AsyncStorage.setItem(key, JSON.stringify(value));
  };

  return [state, setValue];
};

// ============= PANTALLA DE LOGIN =============
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('notifier@example.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });
      await AsyncStorage.setItem('token', response.data.token);
      onLogin(response.data.user);
    } catch (error) {
      Alert.alert('Error', 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sistema de Notificaciones</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Iniciando...' : 'Ingresar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ============= PANTALLA DE NOTIFICACIONES =============
const NotificationsScreen = ({ user, onSelectNotification }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
    });

    loadNotifications();
    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Notificaciones</Text>
        <Text style={styles.statusText}>
          {isOnline ? '🟢 En línea' : '🔴 Sin conexión'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <ScrollView style={styles.list}>
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={styles.notificationCard}
              onPress={() => onSelectNotification(notif)}
            >
              <Text style={styles.cardTitle}>{notif.citizen_name}</Text>
              <Text style={styles.cardSubtitle}>{notif.address}</Text>
              <Text style={styles.cardStatus}>
                Estado: {notif.status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.button} onPress={loadNotifications}>
        <Text style={styles.buttonText}>Refrescar</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============= PANTALLA DE CAPTURA =============
const CaptureScreen = ({ notification, onSave, onBack }) => {
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(false);
  const signatureRef = useRef(null);

  useEffect(() => {
    requestPermissions();
    captureGPS();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  const captureGPS = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => Alert.alert('Error GPS', error.message)
    );
  };

  const handlePhotoCapture = () => {
    // En un proyecto real, usarías react-native-camera
    // Por ahora simulamos con una imagen placeholder
    Alert.prompt(
      'URL de la foto',
      'Ingresa URL de una imagen:',
      (url) => {
        if (url) setPhoto(url);
      }
    );
  };

  const handleSignatureSave = (signature) => {
    setSignature(signature);
    signatureRef.current?.clearSignature();
  };

  const handleSubmit = async () => {
    if (!photo || !signature || !gps) {
      Alert.alert('Error', 'Completa foto, firma y GPS');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const timestamp = new Date().toISOString();

      const response = await axios.post(
        `${API_URL}/sync`,
        {
          notification_id: notification.id,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
          timestamp,
          photo_base64: photo,
          signature_base64: signature,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Éxito', 'Notificación enviada');
      onSave(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la notificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{notification.citizen_name}</Text>
      <Text style={styles.subtitle}>{notification.address}</Text>

      <TouchableOpacity style={styles.button} onPress={captureGPS}>
        <Text style={styles.buttonText}>
          📍 GPS: {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'Capturar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handlePhotoCapture}>
        <Text style={styles.buttonText}>📸 Capturar Foto</Text>
      </TouchableOpacity>

      {photo && <Image source={{ uri: photo }} style={styles.photoPreview} />}

      <Text style={styles.subtitle}>Firma Ológrafa</Text>
      <SignatureCanvas
        ref={signatureRef}
        onOK={handleSignatureSave}
        onClear={() => setSignature(null)}
        webStyle={`
          .m-signature-pad--body { border: 1px solid #ccc; }
          .m-signature-pad--body canvas { width: 100%; height: 200px; }
        `}
      />
      {signature && <Text style={styles.successText}>✓ Firma capturada</Text>}

      <TouchableOpacity
        style={[styles.button, styles.submitButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Enviando...' : '✓ Enviar Notificación'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={onBack}>
        <Text style={styles.buttonText}>← Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= PANTALLA DE CONFIRMACIÓN CON QR =============
const ConfirmationScreen = ({ data, onBack }) => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✓ Notificación Registrada</Text>

      <View style={styles.tokenCard}>
        <Text style={styles.tokenLabel}>Token de Verificación:</Text>
        <Text style={styles.tokenValue}>{data.token.substring(0, 16)}...</Text>
      </View>

      <Text style={styles.subtitle}>Código QR</Text>
      {data.qr_url && (
        <View style={styles.qrContainer}>
          <QRCode value={data.token} size={250} />
        </View>
      )}

      <Text style={styles.subtitle}>Link de Pago</Text>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => Alert.alert('Link de Pago', data.payment_link)}
      >
        <Text style={styles.linkText}>💳 {data.payment_link}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>← Volver a Notificaciones</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= APLICACIÓN PRINCIPAL =============
export default function App() {
  const [user, setUser] = useLocalStorage('user', null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      {!user ? (
        <LoginScreen onLogin={setUser} />
      ) : currentScreen === 'notifications' ? (
        <NotificationsScreen
          user={user}
          onSelectNotification={(notif) => {
            setSelectedNotification(notif);
            setCurrentScreen('capture');
          }}
        />
      ) : currentScreen === 'capture' ? (
        <CaptureScreen
          notification={selectedNotification}
          onSave={(data) => {
            setConfirmationData(data);
            setCurrentScreen('confirmation');
          }}
          onBack={() => setCurrentScreen('notifications')}
        />
      ) : (
        <ConfirmationScreen
          data={confirmationData}
          onBack={() => {
            setCurrentScreen('notifications');
            setConfirmationData(null);
          }}
        />
      )}
    </View>
  );
}

// ============= ESTILOS =============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonSecondary: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  submitButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    marginBottom: 16,
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    marginVertical: 12,
    borderRadius: 8,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  tokenCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#999',
  },
  tokenValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  linkButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  successText: {
    color: '#34C759',
    fontWeight: '600',
    marginTop: 8,
  },
});
