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
  Modal,
  PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL - Usar la IP local de tu PC (localhost no funciona desde el celular)
const API_URL = 'http://192.168.1.77:3000';
const DEMO_MODE = false; // false = conecta al backend real

// ============= DATOS DE PRUEBA =============
const DEMO_NOTIFICATIONS = [
  {
    id: 1,
    citizen_name: 'Juan Pérez',
    address: 'Av. Argentina 1234, Neuquén Capital',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7890',
    amount: '$15,000'
  },
  {
    id: 2,
    citizen_name: 'María García',
    address: 'Calle San Martín 567, Plottier',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7891',
    amount: '$12,500'
  },
  {
    id: 3,
    citizen_name: 'Carlos López',
    address: 'Rivadavia 890, Centenario',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7892',
    amount: '$8,750'
  },
  {
    id: 4,
    citizen_name: 'Ana Rodríguez',
    address: 'Belgrano 234, Cutral-Có',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7893',
    amount: '$20,000'
  },
  {
    id: 5,
    citizen_name: 'Roberto Fernández',
    address: 'Av. Olascoaga 456, Neuquén Capital',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7894',
    amount: '$9,500'
  },
  {
    id: 6,
    citizen_name: 'Laura Martínez',
    address: 'Sarmiento 789, Villa La Angostura',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7895',
    amount: '$18,200'
  },
  {
    id: 7,
    citizen_name: 'Diego Gómez',
    address: 'Mitre 123, San Martín de los Andes',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7896',
    amount: '$11,750'
  },
  {
    id: 8,
    citizen_name: 'Silvia Romero',
    address: 'Córdoba 345, Zapala',
    status: 'pending',
    citizen_phone: '+54 9 299 456-7897',
    amount: '$14,300'
  },
];

// ============= COMPONENTE DE FIRMA TÁCTIL =============
const SignatureCanvas = ({ onSave, onClear, visible, onClose }) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleStart = (e) => {
    setIsDrawing(true);
    const point = getCoordinates(e);
    setCurrentPath([point]);
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    const point = getCoordinates(e);
    setCurrentPath(prev => [...prev, point]);
  };

  const handleEnd = () => {
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath([]);
    setIsDrawing(false);
  };

  const getCoordinates = (e) => {
    // Funciona tanto con touch como con mouse
    const nativeEvent = e.nativeEvent;
    if (nativeEvent.touches && nativeEvent.touches.length > 0) {
      // Touch event
      return {
        x: nativeEvent.touches[0].locationX || nativeEvent.touches[0].pageX,
        y: nativeEvent.touches[0].locationY || nativeEvent.touches[0].pageY
      };
    } else {
      // Mouse event
      return {
        x: nativeEvent.locationX || nativeEvent.offsetX || nativeEvent.layerX,
        y: nativeEvent.locationY || nativeEvent.offsetY || nativeEvent.layerY
      };
    }
  };

  const pathToString = (points) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath([]);
    setIsDrawing(false);
  };

  const handleClear = () => {
    clearCanvas();
    onClear();
  };

  const handleSave = () => {
    if (paths.length === 0 && currentPath.length === 0) {
      Alert.alert('⚠️ Firma vacía', 'Por favor dibuja tu firma antes de guardar');
      return;
    }

    // Generar SVG real a partir de los trazos dibujados
    const allPaths = [...paths];
    if (currentPath.length > 1) allPaths.push(currentPath);

    let svgPaths = '';
    allPaths.forEach(p => {
      const d = pathToString(p);
      if (d) svgPaths += `<path d="${d}" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    });

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="white"/>${svgPaths}</svg>`;

    // Convertir a base64 para enviar al backend
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    onSave(base64);

    // Cerrar el modal
    onClose();

    // Limpiar SOLO el canvas interno (sin llamar onClear que borra la firma guardada)
    setTimeout(() => {
      clearCanvas();
    }, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.signatureModal}>
        <View style={styles.signatureHeader}>
          <Text style={styles.signatureTitle}>✍️ Firma del Ciudadano</Text>
          <Text style={styles.signatureSubtitle}>Dibuja tu firma con el dedo o mouse</Text>
        </View>

        <View
          style={styles.signatureCanvas}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleStart}
          onResponderMove={handleMove}
          onResponderRelease={handleEnd}
        >
          <Svg width="100%" height="100%">
            {/* Renderizar todas las líneas guardadas */}
            {paths.map((path, index) => (
              <Path
                key={`path-${index}`}
                d={pathToString(path)}
                stroke="#000"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* Renderizar línea actual */}
            {currentPath.length > 0 && (
              <Path
                d={pathToString(currentPath)}
                stroke="#000"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </View>

        <View style={styles.signatureActions}>
          <TouchableOpacity style={styles.signatureClearButton} onPress={handleClear}>
            <Text style={styles.signatureClearText}>🗑️ Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signatureSaveButton} onPress={handleSave}>
            <Text style={styles.signatureSaveText}>✓ Guardar Firma</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signatureCloseButton} onPress={onClose}>
          <Text style={styles.backButtonText}>✕ Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ============= PANTALLA DE LOGIN =============
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('notifier@example.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validación básica
    if (!email || !password) {
      Alert.alert('⚠️ Campos requeridos', 'Por favor ingresa email y contraseña');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('⚠️ Email inválido', 'Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      if (DEMO_MODE) {
        // Modo demo - login simulado
        await new Promise(resolve => setTimeout(resolve, 800));

        // Validar credenciales demo
        if (email === 'notifier@example.com' && password === 'demo123') {
          onLogin({ id: 1, email, role: 'notifier' });
        } else {
          throw new Error('Credenciales incorrectas');
        }
      } else {
        // Modo real - conecta al backend
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('El servidor no respondió correctamente. Verificar que la URL del backend sea correcta.');
        }

        if (!response.ok) {
          throw new Error(data.error || 'Credenciales inválidas');
        }

        if (!data.user || !data.token) {
          throw new Error('Respuesta inválida del servidor');
        }

        try {
          await AsyncStorage.setItem('token', data.token);
        } catch (storageErr) {
          console.log('AsyncStorage no disponible, usando variable en memoria');
        }
        global.__authToken = data.token;
        onLogin(data.user);
      }
    } catch (error) {
      Alert.alert(
        'Error de autenticación',
        error.message || 'No se pudo conectar al servidor'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://www.epen.gov.ar/wp-content/uploads/2024/02/Logo-EPEN.jpg' }}
        style={{ width: '100%', height: 120, resizeMode: 'contain', borderRadius: 8, marginBottom: 18 }}
      />
      <View style={styles.loginHeader}>
        <Text style={styles.title}>Sistema de Notificaciones</Text>
        <Text style={styles.subtitle}>EPEN - Notificaciones Presenciales</Text>
      </View>

      <View style={styles.loginForm}>
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

        <View style={styles.demoBadge}>
          <Text style={styles.demoText}>
            {DEMO_MODE ? '🎮 MODO DEMO ACTIVO' : '🌐 CONECTADO AL SERVIDOR'}
          </Text>
        </View>

        <Text style={styles.infoText}>
          Credenciales demo:{'\n'}
          notifier@example.com / demo123
        </Text>
      </View>
    </View>
  );
};

// ============= PANTALLA DE NOTIFICACIONES =============
const NotificationsScreen = ({ user, onSelectNotification, onProfile, onViewDetail }) => {
  const [allData, setAllData] = useState([]);
  const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'completed'
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [dateFilter, setDateFilter] = useState(''); // '' | 'today' | 'week' | 'month'
  const [loading, setLoading] = useState(!DEMO_MODE);

  const loadNotifications = async (silent) => {
    if (!silent) setLoading(true);
    try {
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAllData(DEMO_NOTIFICATIONS);
      } else {
        let token = global.__authToken || '';
        try { token = await AsyncStorage.getItem('token') || token; } catch(e) {}

        const response = await fetch(`${API_URL}/assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar notificaciones');
        }
        setAllData(data);
      }
    } catch (error) {
      if (!silent) {
        Alert.alert('Error', error.message || 'No se pudieron cargar las notificaciones.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
  }, []);

  const pendingList = allData.filter(n => n.status === 'pending' || n.status === 'in_progress');
  const completedList = allData.filter(n => n.status === 'synced' || n.status === 'completed');
  const baseList = viewMode === 'pending' ? pendingList : completedList;

  // Apply date filter
  let filtered = baseList;
  if (dateFilter) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filtered = filtered.filter(n => {
      if (!n.created_at) return false;
      const d = new Date(n.created_at);
      if (dateFilter === 'today') return d >= startOfDay;
      if (dateFilter === 'week') return d >= new Date(startOfDay - 7 * 86400000);
      if (dateFilter === 'month') return d >= new Date(startOfDay - 30 * 86400000);
      return true;
    });
  }

  // Apply search
  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    filtered = filtered.filter(n =>
      (n.citizen_name && n.citizen_name.toLowerCase().includes(q)) ||
      (n.address && n.address.toLowerCase().includes(q)) ||
      (n.nro_orden && n.nro_orden.toString().includes(q)) ||
      (n.created_at && formatShortDate(n.created_at).includes(q))
    );
  }

  // Apply sort
  filtered = [...filtered].sort((a, b) => {
    if (sortOrder === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const formatShortDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://www.epen.gov.ar/wp-content/uploads/2024/02/Logo-EPEN.jpg' }}
        style={{ width: '100%', height: 70, resizeMode: 'contain', borderRadius: 6, marginBottom: 14 }}
      />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis Notificaciones</Text>
          <Text style={styles.userInfo}>{user.email}</Text>
        </View>
        <TouchableOpacity onPress={onProfile} style={{ padding: 8 }}>
          <Text style={{ fontSize: 28 }}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <TouchableOpacity style={[styles.statItem, viewMode === 'pending' && { backgroundColor: '#e8f5e9', borderRadius: 8 }]} onPress={() => setViewMode('pending')}>
          <Text style={styles.statNumber}>{pendingList.length}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={[styles.statItem, viewMode === 'completed' && { backgroundColor: '#e8f5e9', borderRadius: 8 }]} onPress={() => setViewMode('completed')}>
          <Text style={styles.statNumber}>{completedList.length}</Text>
          <Text style={styles.statLabel}>Completadas</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: 8, fontSize: 14 }}
        placeholder="Buscar por nombre, dirección, nro orden..."
        value={searchText}
        onChangeText={setSearchText}
      />
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {[['', 'Todas'], ['today', 'Hoy'], ['week', '7 días'], ['month', '30 días']].map(([val, label]) => (
          <TouchableOpacity key={val} onPress={() => setDateFilter(val)}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: dateFilter === val ? '#2e7d32' : '#e0e0e0' }}>
            <Text style={{ fontSize: 11, color: dateFilter === val ? '#fff' : '#333', fontWeight: '600' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: '#666' }}>{filtered.length} resultado(s)</Text>
        <TouchableOpacity onPress={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}>
          <Text style={{ fontSize: 12, color: '#2e7d32', fontWeight: '600' }}>
            {sortOrder === 'newest' ? 'Más recientes primero' : 'Más antiguas primero'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={{ color: '#999', marginTop: 8 }}>No hay notificaciones {viewMode === 'pending' ? 'pendientes' : 'completadas'}</Text>
            </View>
          ) : filtered.map((notif, index) => (
            <View
              key={notif.id}
              style={[
                styles.notificationCard,
                { borderLeftColor: viewMode === 'completed' ? '#388e3c' : (index % 2 === 0 ? '#2e7d32' : '#1b5e20') }
              ]}
            >
              <Text style={styles.cardTitle}>👤 {notif.citizen_name}</Text>
              <Text style={styles.cardSubtitle}>📍 {notif.address}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {notif.zona ? <Text style={{ fontSize: 10, backgroundColor: '#e8f5e9', color: '#2e7d32', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight: '600' }}>{notif.zona}</Text> : null}
                {notif.nro_orden ? <Text style={{ fontSize: 10, backgroundColor: '#f0f0f0', color: '#555', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>Orden: {notif.nro_orden}</Text> : null}
                {notif.suministro ? <Text style={{ fontSize: 10, backgroundColor: '#f0f0f0', color: '#555', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>Sum: {notif.suministro}</Text> : null}
                {notif.created_at ? <Text style={{ fontSize: 10, color: '#aaa' }}>Alta: {formatShortDate(notif.created_at)}</Text> : null}
              </View>
              {notif.citizen_phone ? <Text style={styles.cardPhone}>📞 {notif.citizen_phone}</Text> : null}
              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, viewMode === 'completed' && { backgroundColor: '#e8f5e9' }]}>
                  <Text style={[styles.cardStatus, viewMode === 'completed' && { color: '#2e7d32' }]}>
                    {viewMode === 'completed' ? '✅ Completada' : '⏳ Pendiente'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {onViewDetail && (
                    <TouchableOpacity onPress={() => onViewDetail(notif)} style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                      <Text style={{ fontSize: 13, color: '#2e7d32', fontWeight: '600' }}>Info</Text>
                    </TouchableOpacity>
                  )}
                  {viewMode === 'completed' && (
                    <TouchableOpacity onPress={() => {
                      if (notif.token) {
                        const url = `${API_URL}/verificar/${notif.token}`;
                        if (typeof window !== 'undefined' && window.open) { window.open(url, '_blank'); }
                        else { Alert.alert('Ficha Oficial', `Abrí este enlace en tu navegador:\n\n${url}`); }
                      } else {
                        // Token not in list cache — open detail screen which fetches fresh data
                        onViewDetail(notif);
                      }
                    }} style={{ backgroundColor: '#2e7d32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                      <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>📄 Ficha</Text>
                    </TouchableOpacity>
                  )}
                  {viewMode === 'pending' && <TouchableOpacity onPress={() => onSelectNotification(notif)}><Text style={styles.cardAction}>Notificar →</Text></TouchableOpacity>}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={loadNotifications}>
        <Text style={styles.refreshButtonText}>🔄 Refrescar Lista</Text>
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
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  useEffect(() => {
    // Validar que notification existe
    if (!notification) {
      Alert.alert('Error', 'No se recibió información de la notificación');
      onBack();
      return;
    }

    // Solicitar permisos
    requestPermissions();

    // Captura real de GPS
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } else {
          Alert.alert('GPS', 'Se necesita acceso a la ubicación para registrar la geolocalización. No podrás enviar la notificación sin GPS.');
        }
      } catch (e) {
        console.log('Error GPS:', e);
        Alert.alert('GPS', 'No se pudo obtener la ubicación. Verifica que el GPS esté activado.');
      }
    })();
  }, []);

  const requestPermissions = async () => {
    try {
      // Solicitar permisos de cámara
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert(
          '⚠️ Permisos necesarios',
          'Se necesita acceso a la cámara para tomar fotos del domicilio'
        );
      }
    } catch (error) {
      console.log('Error solicitando permisos:', error);
    }
  };

  const handlePhotoCapture = async () => {
    try {
      // Verificar permisos
      const permission = await ImagePicker.getCameraPermissionsAsync();
      if (!permission.granted) {
        const request = await ImagePicker.requestCameraPermissionsAsync();
        if (!request.granted) {
          Alert.alert('⚠️ Permiso denegado', 'Se necesita acceso a la cámara');
          return;
        }
      }

      // Abrir la cámara
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        Alert.alert('✅ Éxito', 'Foto capturada correctamente');
      }
    } catch (error) {
      console.log('Error capturando foto:', error);
      Alert.alert('❌ Error', 'No se pudo capturar la foto: ' + error.message);
    }
  };

  const handleSignatureCapture = () => {
    setShowSignatureModal(true);
  };

  const handleSignatureSave = (signatureData) => {
    setSignature(signatureData);
    Alert.alert('✅ Éxito', 'Firma capturada correctamente');
  };

  const handleSignatureClear = () => {
    setSignature(null);
  };

  const handleSubmit = async () => {
    if (!photo || !signature || !gps) {
      Alert.alert('⚠️ Advertencia', 'Debes completar foto, firma y GPS');
      return;
    }

    setLoading(true);

    try {
      let token = global.__authToken || '';
      try { token = await AsyncStorage.getItem('token') || token; } catch(e) {}

      // Convertir foto a base64 si es una URI local
      let photo_base64 = null;
      if (photo) {
        try {
          const resp = await fetch(photo);
          const blob = await resp.blob();
          photo_base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.log('Error convirtiendo foto a base64:', e);
        }
      }

      const response = await fetch(`${API_URL}/api/notifications/${notification.id}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          photo_base64: photo_base64,
          signature_base64: signature,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
        }),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) {
        throw new Error('Respuesta no válida del servidor');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la notificación');
      }

      Alert.alert('Notificacion registrada', 'La notificacion fue registrada correctamente');
      onSave(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo enviar la notificación');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = photo && signature && gps;

  // Validación de seguridad
  if (!notification) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>No hay datos de notificación</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <SignatureCanvas
        visible={showSignatureModal}
        onSave={handleSignatureSave}
        onClear={handleSignatureClear}
        onClose={() => setShowSignatureModal(false)}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📋 Captura de Notificación</Text>

        <View style={styles.citizenCard}>
          <Text style={styles.citizenName}>{notification.citizen_name || 'Sin nombre'}</Text>
          <Text style={styles.citizenAddress}>{notification.address || 'Sin dirección'}</Text>
          <Text style={styles.citizenAmount}>Monto: {notification.amount || '$0'}</Text>
        </View>

      <View style={styles.captureSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📍 Ubicación GPS</Text>
          <Text style={gps ? styles.statusComplete : styles.statusPending}>
            {gps ? '✓' : '⏳'}
          </Text>
        </View>
        <View style={[styles.dataCard, gps && styles.dataCardComplete]}>
          <Text style={styles.gpsText}>
            {gps ? `Lat: ${gps.lat.toFixed(4)}, Lng: ${gps.lng.toFixed(4)}` : 'Capturando GPS...'}
          </Text>
          {gps && <Text style={styles.successText}>✓ Ubicación confirmada</Text>}
        </View>
      </View>

      <View style={styles.captureSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📸 Fotografía del Domicilio</Text>
          <Text style={photo ? styles.statusComplete : styles.statusPending}>
            {photo ? '✓' : '⏳'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, photo && styles.buttonComplete]}
          onPress={handlePhotoCapture}
        >
          <Text style={styles.buttonText}>
            {photo ? '✓ Foto Capturada - Recapturar' : '📸 Capturar Foto'}
          </Text>
        </TouchableOpacity>
        {photo && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photo }} style={styles.photoPreview} />
          </View>
        )}
      </View>

      <View style={styles.captureSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>✍️ Firma del Ciudadano</Text>
          <Text style={signature ? styles.statusComplete : styles.statusPending}>
            {signature ? '✓' : '⏳'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, signature && styles.buttonComplete]}
          onPress={handleSignatureCapture}
        >
          <Text style={styles.buttonText}>
            {signature ? '✓ Firma Capturada - Recapturar' : '✍️ Capturar Firma'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading || !canSubmit}
      >
        <Text style={styles.submitButtonText}>
          {loading ? '📤 Enviando...' : '✓ Enviar Notificación y SMS'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>
      </ScrollView>
    </>
  );
};

// ============= PANTALLA DE CONFIRMACIÓN =============
const ConfirmationScreen = ({ data, onBack }) => {
  // Validación de datos
  if (!data || !data.token) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Error de Datos</Text>
          <Text style={styles.errorText}>No se recibieron los datos de confirmación</Text>
        </View>
        <TouchableOpacity style={styles.doneButton} onPress={onBack}>
          <Text style={styles.doneButtonText}>← Volver a Notificaciones</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.successHeader}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>¡Notificación Registrada!</Text>
        <Text style={styles.successSubtitle}>
          Ciudadano: {data.citizen_name || 'N/A'}
        </Text>
        <Text style={styles.timestamp}>{data.timestamp || new Date().toLocaleString('es-AR')}</Text>
      </View>

      <View style={styles.tokenCard}>
        <Text style={styles.tokenLabel}>🔐 Token de Verificación</Text>
        <Text style={styles.tokenValue}>
          {data.token ? data.token.substring(0, 20) + '...' : 'Token no disponible'}
        </Text>
        <Text style={styles.tokenHint}>Este token garantiza la autenticidad</Text>
      </View>

      <View style={styles.qrSection}>
        <Text style={styles.sectionTitle}>📱 Código QR de Verificación</Text>
        <View style={styles.qrContainer}>
          {data.qr_url ? (
            <Image
              source={{ uri: data.qr_url }}
              style={styles.qrImage}
              onError={() => console.log('Error cargando QR')}
            />
          ) : (
            <View style={[styles.qrImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#999' }}>QR no disponible</Text>
            </View>
          )}
        </View>
        <Text style={styles.qrHint}>Escanea para verificar la notificación</Text>
      </View>

      <View style={styles.linkSection}>
        <Text style={styles.sectionTitle}>💳 Link de Pago (enviado por SMS)</Text>
        <View style={styles.linkCard}>
          <Text style={styles.linkText} numberOfLines={3}>
            {data.payment_link || 'Link no disponible'}
          </Text>
        </View>
        <Text style={styles.smsHint}>📲 SMS enviado al ciudadano</Text>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={onBack}>
        <Text style={styles.doneButtonText}>← Volver a Notificaciones</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= PANTALLA DE DETALLE DE NOTIFICACIÓN =============
const NotificationDetailScreen = ({ notification, onBack, onCapture }) => {
  const [n, setN] = useState(notification);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch fresh data from server to get token and latest fields
  useEffect(() => {
    if (!DEMO_MODE && notification && notification.id) {
      (async () => {
        setLoadingDetail(true);
        try {
          let token = global.__authToken || '';
          try { token = await AsyncStorage.getItem('token') || token; } catch(e) {}
          const res = await fetch(`${API_URL}/api/notifications/${notification.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setN(data);
          }
        } catch (e) {
          console.log('Error fetching detail:', e);
        } finally {
          setLoadingDetail(false);
        }
      })();
    }
  }, [notification]);

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('es-AR');
  };
  const isPending = n.status === 'pending' || n.status === 'in_progress';

  const openFicha = () => {
    const url = `${API_URL}/verificar/${n.token}`;
    if (typeof window !== 'undefined' && window.open) { window.open(url, '_blank'); }
    else { Alert.alert('Ficha Oficial', `Abrí este enlace en tu navegador:\n\n${url}`); }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Detalle de Notificación</Text>

      <View style={styles.citizenCard}>
        <Text style={styles.citizenName}>{n.citizen_name || '-'}</Text>
        <Text style={styles.citizenAddress}>{n.address || '-'}</Text>
        {n.citizen_phone ? <Text style={styles.cardPhone}>📞 {n.citizen_phone}</Text> : null}
      </View>

      <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: '#333', marginBottom: 10, fontSize: 15 }}>Datos EPEN</Text>
        {[
          ['Nro. Orden', n.nro_orden],
          ['Suministro', n.suministro],
          ['Nro. Cliente', n.nro_cliente],
          ['Tipo', n.tipo_notificacion],
          ['Cronograma', n.nro_cronograma],
          ['Zona', n.zona],
          ['Sucursal', n.sucursal],
          ['Correo', n.correo],
          ['Fecha Alta', formatDate(n.created_at)],
          ['Estado', isPending ? 'Pendiente' : 'Completada'],
        ].map(([label, value]) => value ? (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <Text style={{ fontSize: 13, color: '#888' }}>{label}</Text>
            <Text style={{ fontSize: 13, color: '#333', fontWeight: '500', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
          </View>
        ) : null)}
      </View>

      {isPending && onCapture && (
        <TouchableOpacity style={styles.submitButton} onPress={() => onCapture(n)}>
          <Text style={styles.submitButtonText}>Notificar →</Text>
        </TouchableOpacity>
      )}
      {!isPending && n.token && (
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#1b5e20' }]} onPress={openFicha}>
          <Text style={styles.submitButtonText}>📄 Ver Ficha Oficial / PDF</Text>
        </TouchableOpacity>
      )}
      {!isPending && !n.token && !loadingDetail && (
        <View style={{ backgroundColor: '#fff3cd', padding: 14, borderRadius: 8, marginTop: 16 }}>
          <Text style={{ fontSize: 13, color: '#856404', textAlign: 'center' }}>La ficha oficial no está disponible para esta notificación</Text>
        </View>
      )}
      {loadingDetail && <ActivityIndicator size="small" color="#2e7d32" style={{ marginTop: 16 }} />}

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= PANTALLA DE PERFIL =============
const ProfileScreen = ({ user, onBack, onLogout }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Perfil</Text>

      <View style={[styles.citizenCard, { borderLeftColor: '#2e7d32', marginTop: 20 }]}>
        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>👤</Text>
        <Text style={styles.citizenName}>{user.name || user.email}</Text>
        <Text style={styles.citizenAddress}>{user.email}</Text>
        <Text style={{ fontSize: 14, color: '#2e7d32', marginTop: 8, fontWeight: '600' }}>
          Rol: {user.role === 'admin' ? 'Administrador' : 'Notificador'}
        </Text>
      </View>

      <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#c62828', marginTop: 30 }]} onPress={onLogout}>
        <Text style={styles.submitButtonText}>Cerrar Sesion</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============= APLICACIÓN PRINCIPAL =============
export default function App() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);

  useEffect(() => {
    if (!user) {
      setCurrentScreen('login');
    } else {
      setCurrentScreen('notifications');
    }
  }, [user]);

  const handleLogout = async () => {
    try { await AsyncStorage.removeItem('token'); } catch(e) {}
    global.__authToken = null;
    setUser(null);
    setCurrentScreen('login');
  };

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
          onViewDetail={(notif) => {
            setSelectedNotification(notif);
            setCurrentScreen('detail');
          }}
          onProfile={() => setCurrentScreen('profile')}
        />
      ) : currentScreen === 'detail' ? (
        <NotificationDetailScreen
          notification={selectedNotification}
          onBack={() => setCurrentScreen('notifications')}
          onCapture={(notif) => {
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
      ) : currentScreen === 'profile' ? (
        <ProfileScreen
          user={user}
          onBack={() => setCurrentScreen('notifications')}
          onLogout={handleLogout}
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
  loginHeader: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loginForm: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2e7d32',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    fontSize: 12,
    marginRight: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  userInfo: {
    fontSize: 13,
    color: '#666',
  },
  demoBadge: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  demoText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonComplete: {
    backgroundColor: '#333333',
  },
  refreshButton: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#2e7d32',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  doneButton: {
    backgroundColor: '#2e7d32',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#388e3c',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardPhone: {
    fontSize: 14,
    color: '#2e7d32',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardStatus: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
  cardAction: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  citizenCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: '#2e7d32',
  },
  citizenName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  citizenAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  citizenAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  captureSection: {
    marginBottom: 24,
  },
  statusPending: {
    fontSize: 20,
    color: '#ffc107',
  },
  statusComplete: {
    fontSize: 20,
    color: '#2e7d32',
  },
  dataCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  dataCardComplete: {
    borderLeftColor: '#2e7d32',
  },
  gpsText: {
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewContainer: {
    marginTop: 12,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  successHeader: {
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 30,
    borderRadius: 12,
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#1b5e20',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#1b5e20',
    marginTop: 8,
  },
  tokenCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: '#2e7d32',
  },
  tokenLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  tokenValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  tokenHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  qrSection: {
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginVertical: 12,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  qrHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  linkSection: {
    marginBottom: 24,
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginVertical: 12,
  },
  linkText: {
    fontSize: 11,
    color: '#2e7d32',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  smsHint: {
    fontSize: 12,
    color: '#2e7d32',
    textAlign: 'center',
    fontWeight: '600',
  },
  successText: {
    color: '#2e7d32',
    fontWeight: '600',
    marginTop: 8,
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#721c24',
    textAlign: 'center',
  },
  // Estilos para firma táctil
  signatureModal: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  signatureHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  signatureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  signatureSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  signatureCanvas: {
    height: 250,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#388e3c',
    borderStyle: 'dashed',
    marginVertical: 20,
    position: 'relative',
  },
  signatureActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signatureClearButton: {
    flex: 1,
    backgroundColor: '#c62828',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  signatureClearText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signatureSaveButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  signatureSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signatureCloseButton: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
});
