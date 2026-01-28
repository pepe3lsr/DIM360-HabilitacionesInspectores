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
  Platform,
} from 'react-native';
import axios from 'axios';

// API URL - Cambia esto a tu IP local si tienes el backend corriendo
const API_URL = 'http://localhost:3000';

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
      onLogin(response.data.user);
    } catch (error) {
      Alert.alert('Error', 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Sistema de Notificaciones</Text>
      <Text style={styles.subtitle}>Ingresa tus credenciales</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
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

      <Text style={styles.infoText}>
        Demo: notifier@example.com / demo123
      </Text>
    </View>
  );
};

// ============= PANTALLA DE NOTIFICACIONES =============
const NotificationsScreen = ({ user, onSelectNotification }) => {
  const [notifications, setNotifications] = useState([
    // Datos de ejemplo para demo
    {
      id: 1,
      citizen_name: 'Juan Pérez',
      address: 'Av. Libertador 1234',
      status: 'pending',
      citizen_phone: '+54911234567'
    },
    {
      id: 2,
      citizen_name: 'María García',
      address: 'Calle Rivadavia 567',
      status: 'pending',
      citizen_phone: '+54911234568'
    },
    {
      id: 3,
      citizen_name: 'Carlos López',
      address: 'San Martín 890',
      status: 'pending',
      citizen_phone: '+54911234569'
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Simular carga de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Éxito', 'Notificaciones actualizadas');
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

      <Text style={styles.userInfo}>👤 {user.email}</Text>

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
              <Text style={styles.cardTitle}>👤 {notif.citizen_name}</Text>
              <Text style={styles.cardSubtitle}>📍 {notif.address}</Text>
              <Text style={styles.cardPhone}>📞 {notif.citizen_phone}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.cardStatus}>
                  Estado: {notif.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.buttonSecondary} onPress={loadNotifications}>
        <Text style={styles.buttonText}>🔄 Refrescar</Text>
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

  useEffect(() => {
    // Simular captura automática de GPS
    setTimeout(() => {
      setGps({
        lat: -26.8213,
        lng: -65.2038,
      });
    }, 500);
  }, []);

  const handlePhotoCapture = () => {
    // Usar una imagen de ejemplo
    const demoPhoto = 'https://via.placeholder.com/400x300/007AFF/ffffff?text=Foto+Capturada';
    setPhoto(demoPhoto);
    Alert.alert('Éxito', 'Foto capturada correctamente');
  };

  const handleSignatureCapture = () => {
    // Simular firma capturada
    const demoSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    setSignature(demoSignature);
    Alert.alert('Éxito', 'Firma capturada correctamente');
  };

  const handleSubmit = async () => {
    if (!photo || !signature || !gps) {
      Alert.alert('Error', 'Completa foto, firma y GPS');
      return;
    }

    setLoading(true);

    try {
      const timestamp = new Date().toISOString();

      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockResponse = {
        success: true,
        token: '9ff6c476af5a7fcfdf785cc48dfa24c84d9a0035ec0f64002b3b5bbde535b54e',
        qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=9ff6c476af5a7fcfdf785cc48dfa24c84d9a0035ec0f64002b3b5bbde535b54e',
        payment_link: 'https://pago.ejemplo.com/notificacion/9ff6c476af5a7fcfdf785cc48dfa24c84d9a0035ec0f64002b3b5bbde535b54e'
      };

      Alert.alert('Éxito', 'Notificación enviada correctamente');
      onSave(mockResponse);
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la notificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📋 Captura de Notificación</Text>
      <Text style={styles.cardTitle}>{notification.citizen_name}</Text>
      <Text style={styles.subtitle}>{notification.address}</Text>

      <View style={styles.captureSection}>
        <Text style={styles.sectionTitle}>📍 Ubicación GPS</Text>
        <View style={styles.gpsCard}>
          <Text style={styles.gpsText}>
            {gps ? `Lat: ${gps.lat.toFixed(4)}, Lng: ${gps.lng.toFixed(4)}` : 'Capturando...'}
          </Text>
          {gps && <Text style={styles.successText}>✓ GPS Capturado</Text>}
        </View>
      </View>

      <View style={styles.captureSection}>
        <Text style={styles.sectionTitle}>📸 Fotografía</Text>
        <TouchableOpacity style={styles.button} onPress={handlePhotoCapture}>
          <Text style={styles.buttonText}>Capturar Foto</Text>
        </TouchableOpacity>
        {photo && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photo }} style={styles.photoPreview} />
            <Text style={styles.successText}>✓ Foto Capturada</Text>
          </View>
        )}
      </View>

      <View style={styles.captureSection}>
        <Text style={styles.sectionTitle}>✍️ Firma Ológrafa</Text>
        <TouchableOpacity style={styles.button} onPress={handleSignatureCapture}>
          <Text style={styles.buttonText}>Capturar Firma</Text>
        </TouchableOpacity>
        {signature && <Text style={styles.successText}>✓ Firma Capturada</Text>}
      </View>

      <TouchableOpacity
        style={[styles.button, styles.submitButton]}
        onPress={handleSubmit}
        disabled={loading || !photo || !signature || !gps}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Enviando...' : '✓ Enviar Notificación'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={onBack}>
        <Text style={styles.buttonTextDark}>← Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= PANTALLA DE CONFIRMACIÓN CON QR =============
const ConfirmationScreen = ({ data, onBack }) => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✓ Notificación Registrada</Text>

      <View style={styles.successCard}>
        <Text style={styles.successTitle}>¡Proceso Completado!</Text>
        <Text style={styles.successSubtitle}>
          La notificación ha sido registrada exitosamente
        </Text>
      </View>

      <View style={styles.tokenCard}>
        <Text style={styles.tokenLabel}>Token de Verificación:</Text>
        <Text style={styles.tokenValue}>{data.token.substring(0, 16)}...</Text>
      </View>

      <Text style={styles.sectionTitle}>📱 Código QR</Text>
      <View style={styles.qrContainer}>
        <Image
          source={{ uri: data.qr_url }}
          style={styles.qrImage}
        />
      </View>

      <Text style={styles.sectionTitle}>💳 Link de Pago</Text>
      <View style={styles.linkCard}>
        <Text style={styles.linkText} numberOfLines={2}>
          {data.payment_link}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>← Volver a Notificaciones</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= APLICACIÓN PRINCIPAL =============
export default function App() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);

  useEffect(() => {
    // Resetear a login si no hay usuario
    if (!user) {
      setCurrentScreen('login');
    } else {
      setCurrentScreen('notifications');
    }
  }, [user]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
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
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDark: {
    color: '#333',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardPhone: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  cardStatus: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  captureSection: {
    marginBottom: 20,
  },
  gpsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  gpsText: {
    fontSize: 14,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewContainer: {
    marginTop: 12,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  successCard: {
    backgroundColor: '#d4edda',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#155724',
  },
  tokenCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  tokenValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginVertical: 12,
  },
  linkText: {
    fontSize: 12,
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successText: {
    color: '#34C759',
    fontWeight: '600',
    marginTop: 8,
    fontSize: 14,
  },
});
