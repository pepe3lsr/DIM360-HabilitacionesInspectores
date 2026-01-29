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

// Importar configuración desde archivo externo
import { API_URL, DEMO_MODE } from './config';

// ============= DATOS DE PRUEBA =============
const DEMO_INSPECTIONS = [
  {
    id: 1,
    nombre_comercio: 'Panadería Don José',
    direccion: 'Av. Sarmiento 450, San Miguel de Tucumán',
    status: 'pending',
    numero_habilitacion: 'HAB-2024-001',
    titular: 'José María González',
    cuit: '20-25678901-3',
    rubro: 'ALIMENTOS',
    tipo_habilitacion: 'COMERCIO',
    zona: 'Distrito 1'
  },
  {
    id: 2,
    nombre_comercio: 'Farmacia del Sol',
    direccion: 'San Martín 1234, San Miguel de Tucumán',
    status: 'pending',
    numero_habilitacion: 'HAB-2024-002',
    titular: 'María Elena Ruiz',
    cuit: '27-30456789-1',
    rubro: 'FARMACIA',
    tipo_habilitacion: 'COMERCIO',
    zona: 'Distrito 1'
  },
  {
    id: 3,
    nombre_comercio: 'Restaurante El Tucumano',
    direccion: '24 de Septiembre 890, San Miguel de Tucumán',
    status: 'pending',
    numero_habilitacion: 'HAB-2024-003',
    titular: 'Carlos Alberto Paz',
    cuit: '20-28765432-5',
    rubro: 'GASTRONOMIA',
    tipo_habilitacion: 'COMERCIO',
    zona: 'Distrito 2'
  },
  {
    id: 4,
    nombre_comercio: 'Ferretería Industrial Norte',
    direccion: 'Av. Mate de Luna 2100, San Miguel de Tucumán',
    status: 'pending',
    numero_habilitacion: 'HAB-2024-004',
    titular: 'Roberto Fernández',
    cuit: '20-22345678-9',
    rubro: 'FERRETERIA',
    tipo_habilitacion: 'COMERCIO',
    zona: 'Distrito 5'
  },
  {
    id: 5,
    nombre_comercio: 'Kiosco La Esquina',
    direccion: 'Lamadrid 567, San Miguel de Tucumán',
    status: 'pending',
    numero_habilitacion: 'HAB-2024-005',
    titular: 'Ana Lucía Medina',
    cuit: '27-35678901-2',
    rubro: 'KIOSCO',
    tipo_habilitacion: 'COMERCIO',
    zona: 'Distrito 1'
  },
  {
    id: 6,
    nombre_comercio: 'Taller Mecánico Express',
    direccion: 'Av. Roca 3200, San Miguel de Tucumán',
    status: 'pending',
    numero_habilitacion: 'HAB-2024-006',
    titular: 'Juan Carlos López',
    cuit: '20-24567890-4',
    rubro: 'TALLER MECANICO',
    tipo_habilitacion: 'SERVICIOS',
    zona: 'Distrito 10'
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
  const [email, setEmail] = useState('inspector@example.com');
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
        if (email === 'inspector@example.com' && password === 'demo123') {
          onLogin({ id: 1, email, role: 'inspector' });
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
        source={{ uri: `${API_URL}/img/logo-dim360.png` }}
        style={{ width: '100%', height: 120, resizeMode: 'contain', borderRadius: 8, marginBottom: 18 }}
      />
      <View style={styles.loginHeader}>
        <Text style={styles.title}>DIM360 - Inspecciones</Text>
        <Text style={styles.subtitle}>Municipalidad de San Miguel de Tucumán</Text>
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
          inspector@example.com / demo123
        </Text>
      </View>
    </View>
  );
};

// ============= PANTALLA DE INSPECCIONES =============
const InspectionsScreen = ({ user, onSelectInspection, onProfile, onViewDetail }) => {
  const [allData, setAllData] = useState([]);
  const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'completed'
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [dateFilter, setDateFilter] = useState(''); // '' | 'today' | 'week' | 'month'
  const [loading, setLoading] = useState(!DEMO_MODE);

  const loadInspections = async (silent) => {
    if (!silent) setLoading(true);
    try {
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAllData(DEMO_INSPECTIONS);
      } else {
        let token = global.__authToken || '';
        try { token = await AsyncStorage.getItem('token') || token; } catch(e) {}

        const response = await fetch(`${API_URL}/assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar inspecciones');
        }
        setAllData(data);
      }
    } catch (error) {
      if (!silent) {
        Alert.alert('Error', error.message || 'No se pudieron cargar las inspecciones.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections(true);
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
        source={{ uri: `${API_URL}/img/logo-dim360.png` }}
        style={{ width: '100%', height: 70, resizeMode: 'contain', borderRadius: 6, marginBottom: 14 }}
      />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis Inspecciones</Text>
          <Text style={styles.userInfo}>{user.email}</Text>
        </View>
        <TouchableOpacity onPress={onProfile} style={{ padding: 8 }}>
          <Text style={{ fontSize: 28 }}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <TouchableOpacity style={[styles.statItem, viewMode === 'pending' && { backgroundColor: '#e6f0ff', borderRadius: 8 }]} onPress={() => setViewMode('pending')}>
          <Text style={styles.statNumber}>{pendingList.length}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={[styles.statItem, viewMode === 'completed' && { backgroundColor: '#e6f0ff', borderRadius: 8 }]} onPress={() => setViewMode('completed')}>
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
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: dateFilter === val ? '#0066ff' : '#e0e0e0' }}>
            <Text style={{ fontSize: 11, color: dateFilter === val ? '#fff' : '#333', fontWeight: '600' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: '#666' }}>{filtered.length} resultado(s)</Text>
        <TouchableOpacity onPress={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}>
          <Text style={{ fontSize: 12, color: '#0066ff', fontWeight: '600' }}>
            {sortOrder === 'newest' ? 'Más recientes primero' : 'Más antiguas primero'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0066ff" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={{ color: '#999', marginTop: 8 }}>No hay inspecciones {viewMode === 'pending' ? 'pendientes' : 'completadas'}</Text>
            </View>
          ) : filtered.map((insp, index) => (
            <View
              key={insp.id}
              style={[
                styles.inspectionCard,
                { borderLeftColor: viewMode === 'completed' ? '#3385ff' : (index % 2 === 0 ? '#0066ff' : '#0052cc') }
              ]}
            >
              <Text style={styles.cardTitle}>👤 {insp.nombre_comercio}</Text>
              <Text style={styles.cardSubtitle}>📍 {insp.direccion}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {insp.zona ? <Text style={{ fontSize: 10, backgroundColor: '#e6f0ff', color: '#0066ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight: '600' }}>{insp.zona}</Text> : null}
                {insp.numero_habilitacion ? <Text style={{ fontSize: 10, backgroundColor: '#f0f0f0', color: '#555', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>Hab: {insp.numero_habilitacion}</Text> : null}
                {insp.titular ? <Text style={{ fontSize: 10, backgroundColor: '#f0f0f0', color: '#555', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>Titular: {insp.titular}</Text> : null}
                {insp.created_at ? <Text style={{ fontSize: 10, color: '#aaa' }}>Alta: {formatShortDate(insp.created_at)}</Text> : null}
              </View>
              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, viewMode === 'completed' && { backgroundColor: '#e6f0ff' }]}>
                  <Text style={[styles.cardStatus, viewMode === 'completed' && { color: '#0066ff' }]}>
                    {viewMode === 'completed' ? '✅ Completada' : '⏳ Pendiente'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {onViewDetail && (
                    <TouchableOpacity onPress={() => onViewDetail(insp)} style={{ backgroundColor: '#e6f0ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                      <Text style={{ fontSize: 13, color: '#0066ff', fontWeight: '600' }}>Info</Text>
                    </TouchableOpacity>
                  )}
                  {viewMode === 'completed' && (
                    <TouchableOpacity onPress={() => {
                      if (insp.token) {
                        const url = `${API_URL}/verificar/${insp.token}`;
                        if (typeof window !== 'undefined' && window.open) { window.open(url, '_blank'); }
                        else { Alert.alert('Constancia', `Abrí este enlace en tu navegador:\n\n${url}`); }
                      } else {
                        // Token not in list cache — open detail screen which fetches fresh data
                        onViewDetail(insp);
                      }
                    }} style={{ backgroundColor: '#0066ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                      <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>📄 Constancia</Text>
                    </TouchableOpacity>
                  )}
                  {viewMode === 'pending' && <TouchableOpacity onPress={() => onSelectInspection(insp)}><Text style={styles.cardAction}>Inspeccionar →</Text></TouchableOpacity>}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={loadInspections}>
        <Text style={styles.refreshButtonText}>🔄 Refrescar Lista</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============= PANTALLA DE CAPTURA =============
const CaptureScreen = ({ inspection, onSave, onBack }) => {
  const [photo, setPhoto] = useState(null);
  const [detalle, setDetalle] = useState('');
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Validar que inspection existe
    if (!inspection) {
      Alert.alert('Error', 'No se recibió información de la inspección');
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
          Alert.alert('GPS', 'Se necesita acceso a la ubicación para registrar la geolocalización.');
        }
      } catch (e) {
        console.log('Error GPS:', e);
        Alert.alert('GPS', 'No se pudo obtener la ubicación. Verifica que el GPS esté activado.');
      }
    })();
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert(
          '⚠️ Permisos necesarios',
          'Se necesita acceso a la cámara para tomar fotos del establecimiento'
        );
      }
    } catch (error) {
      console.log('Error solicitando permisos:', error);
    }
  };

  const handlePhotoCapture = async () => {
    try {
      const permission = await ImagePicker.getCameraPermissionsAsync();
      if (!permission.granted) {
        const request = await ImagePicker.requestCameraPermissionsAsync();
        if (!request.granted) {
          Alert.alert('⚠️ Permiso denegado', 'Se necesita acceso a la cámara');
          return;
        }
      }

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

  const handleSubmit = async () => {
    if (!photo || !gps) {
      Alert.alert('⚠️ Advertencia', 'Debes completar foto y GPS');
      return;
    }

    setLoading(true);

    try {
      let token = global.__authToken || '';
      try { token = await AsyncStorage.getItem('token') || token; } catch(e) {}

      // Convertir foto a base64
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

      const response = await fetch(`${API_URL}/api/inspections/${inspection.id}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          photo_base64: photo_base64,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
          detalle: detalle,
        }),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) {
        throw new Error('Respuesta no válida del servidor');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la inspección');
      }

      Alert.alert('Inspección registrada', 'La inspección fue registrada correctamente');
      onSave(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo enviar la inspección');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = photo && gps;

  // Validación de seguridad
  if (!inspection) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>No hay datos de inspección</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>📋 Captura de Inspección</Text>

      <View style={styles.citizenCard}>
        <Text style={styles.citizenName}>{inspection.nombre_comercio || 'Sin nombre'}</Text>
        <Text style={styles.citizenAddress}>{inspection.direccion || 'Sin dirección'}</Text>
        <Text style={styles.citizenAmount}>Hab. N°: {inspection.numero_habilitacion || '-'}</Text>
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
          <Text style={styles.sectionTitle}>📸 Fotografía del Establecimiento</Text>
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
          <Text style={styles.sectionTitle}>📝 Observaciones</Text>
        </View>
        <TextInput
          style={styles.detalleInput}
          placeholder="Escribe observaciones o detalles de la inspección..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          value={detalle}
          onChangeText={setDetalle}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading || !canSubmit}
      >
        <Text style={styles.submitButtonText}>
          {loading ? '📤 Enviando...' : '✓ Registrar Inspección'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= PANTALLA DE CONFIRMACIÓN =============
const ConfirmationScreen = ({ data, onBack }) => {
  // Validación de datos
  if (!data || !data.success) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Error de Datos</Text>
          <Text style={styles.errorText}>No se recibieron los datos de confirmación</Text>
        </View>
        <TouchableOpacity style={styles.doneButton} onPress={onBack}>
          <Text style={styles.doneButtonText}>← Volver a Inspecciones</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.successHeader}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>¡Inspección Registrada!</Text>
        <Text style={styles.successSubtitle}>
          {data.nombre_comercio || 'Comercio'}
        </Text>
        <Text style={styles.timestamp}>{data.timestamp || new Date().toLocaleString('es-AR')}</Text>
      </View>

      <View style={styles.tokenCard}>
        <Text style={styles.tokenLabel}>📍 Dirección</Text>
        <Text style={styles.tokenValue}>{data.direccion || '-'}</Text>
      </View>

      <View style={styles.successMessageCard}>
        <Text style={styles.successMessageText}>
          La inspección ha sido registrada correctamente con la geolocalización y documentación fotográfica.
        </Text>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={onBack}>
        <Text style={styles.doneButtonText}>← Volver a Inspecciones</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============= PANTALLA DE DETALLE DE INSPECCIÓN =============
const InspectionDetailScreen = ({ inspection, onBack, onCapture }) => {
  const [n, setN] = useState(inspection);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch fresh data from server
  useEffect(() => {
    if (!DEMO_MODE && inspection && inspection.id) {
      (async () => {
        setLoadingDetail(true);
        try {
          let token = global.__authToken || '';
          try { token = await AsyncStorage.getItem('token') || token; } catch(e) {}
          const res = await fetch(`${API_URL}/api/inspections/${inspection.id}`, {
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
  }, [inspection]);

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('es-AR');
  };
  const isPending = n.status === 'pending' || n.status === 'in_progress';

  const openFicha = () => {
    const url = `${API_URL}/verificar/${n.token}`;
    if (typeof window !== 'undefined' && window.open) { window.open(url, '_blank'); }
    else { Alert.alert('Constancia', `Abrí este enlace en tu navegador:\n\n${url}`); }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Detalle de Inspección</Text>

      <View style={styles.citizenCard}>
        <Text style={styles.citizenName}>{n.nombre_comercio || '-'}</Text>
        <Text style={styles.citizenAddress}>{n.direccion || '-'}</Text>
        {n.numero_habilitacion ? <Text style={styles.cardPhone}>📋 Hab. N°: {n.numero_habilitacion}</Text> : null}
      </View>

      <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: '#333', marginBottom: 10, fontSize: 15 }}>Datos de la Habilitación</Text>
        {[
          ['Nro. Habilitación', n.numero_habilitacion],
          ['Titular', n.titular],
          ['CUIT', n.cuit],
          ['Rubro', n.rubro],
          ['Tipo Habilitación', n.tipo_habilitacion],
          ['Zona', n.zona],
          ['Fecha Alta', formatDate(n.created_at)],
          ['Estado', isPending ? 'Pendiente' : 'Inspeccionada'],
        ].map(([label, value]) => value ? (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <Text style={{ fontSize: 13, color: '#888' }}>{label}</Text>
            <Text style={{ fontSize: 13, color: '#333', fontWeight: '500', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
          </View>
        ) : null)}
      </View>

      {isPending && onCapture && (
        <TouchableOpacity style={styles.submitButton} onPress={() => onCapture(n)}>
          <Text style={styles.submitButtonText}>Inspeccionar →</Text>
        </TouchableOpacity>
      )}
      {!isPending && n.token && (
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#0052cc' }]} onPress={openFicha}>
          <Text style={styles.submitButtonText}>📄 Ver Constancia</Text>
        </TouchableOpacity>
      )}
      {!isPending && !n.token && !loadingDetail && (
        <View style={{ backgroundColor: '#fff3cd', padding: 14, borderRadius: 8, marginTop: 16 }}>
          <Text style={{ fontSize: 13, color: '#856404', textAlign: 'center' }}>La constancia no está disponible para esta inspección</Text>
        </View>
      )}
      {loadingDetail && <ActivityIndicator size="small" color="#0066ff" style={{ marginTop: 16 }} />}

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

      <View style={[styles.citizenCard, { borderLeftColor: '#0066ff', marginTop: 20 }]}>
        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>👤</Text>
        <Text style={styles.citizenName}>{user.name || user.email}</Text>
        <Text style={styles.citizenAddress}>{user.email}</Text>
        <Text style={{ fontSize: 14, color: '#0066ff', marginTop: 8, fontWeight: '600' }}>
          Rol: {user.role === 'admin' ? 'Administrador' : 'Inspector'}
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
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);

  useEffect(() => {
    if (!user) {
      setCurrentScreen('login');
    } else {
      setCurrentScreen('inspections');
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
      ) : currentScreen === 'inspections' ? (
        <InspectionsScreen
          user={user}
          onSelectInspection={(insp) => {
            setSelectedInspection(insp);
            setCurrentScreen('capture');
          }}
          onViewDetail={(insp) => {
            setSelectedInspection(insp);
            setCurrentScreen('detail');
          }}
          onProfile={() => setCurrentScreen('profile')}
        />
      ) : currentScreen === 'detail' ? (
        <InspectionDetailScreen
          inspection={selectedInspection}
          onBack={() => setCurrentScreen('inspections')}
          onCapture={(insp) => {
            setSelectedInspection(insp);
            setCurrentScreen('capture');
          }}
        />
      ) : currentScreen === 'capture' ? (
        <CaptureScreen
          inspection={selectedInspection}
          onSave={(data) => {
            setConfirmationData(data);
            setCurrentScreen('confirmation');
          }}
          onBack={() => setCurrentScreen('inspections')}
        />
      ) : currentScreen === 'profile' ? (
        <ProfileScreen
          user={user}
          onBack={() => setCurrentScreen('inspections')}
          onLogout={handleLogout}
        />
      ) : (
        <ConfirmationScreen
          data={confirmationData}
          onBack={() => {
            setCurrentScreen('inspections');
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
    borderBottomColor: '#0066ff',
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
    backgroundColor: '#0066ff',
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
    backgroundColor: '#0066ff',
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
    backgroundColor: '#0066ff',
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
    color: '#3385ff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  inspectionCard: {
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
    color: '#0066ff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardPhone: {
    fontSize: 14,
    color: '#0066ff',
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
    color: '#0066ff',
    fontWeight: '600',
  },
  citizenCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: '#0066ff',
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
    color: '#0066ff',
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
    color: '#0066ff',
  },
  dataCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  dataCardComplete: {
    borderLeftColor: '#0066ff',
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
    backgroundColor: '#e6f0ff',
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
    color: '#0052cc',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#0052cc',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#0052cc',
    marginTop: 8,
  },
  tokenCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: '#0066ff',
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
    color: '#0066ff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  smsHint: {
    fontSize: 12,
    color: '#0066ff',
    textAlign: 'center',
    fontWeight: '600',
  },
  successText: {
    color: '#0066ff',
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
    borderColor: '#3385ff',
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
    backgroundColor: '#0066ff',
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
  detalleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  successMessageCard: {
    backgroundColor: '#e6f0ff',
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#0066ff',
  },
  successMessageText: {
    fontSize: 14,
    color: '#0052cc',
    textAlign: 'center',
    lineHeight: 22,
  },
});
