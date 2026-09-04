import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  Alert, StatusBar, RefreshControl, Modal, Linking, Image 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CameraScreen from './src/CameraScreen';
import AdminScannerScreen from './src/AdminScannerScreen';
import CommunityFeedScreen from './src/CommunityFeedScreen';
import PerfilScreen from './src/PerfilScreen';
import { Colors } from './colors';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// URL Pública de Producción en Railway.com
const API_URL = 'https://backend-mijovi-production.up.railway.app';
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/maratonmijovi/?hl=es';
const INSTAGRAM_HIGHLIGHTS_URL = 'https://www.instagram.com/stories/highlights/17941850090997104/?hl=es';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [inputPin, setInputPin] = useState('');

  const [showCameraInCommunity, setShowCameraInCommunity] = useState(false);
  const [userTab, setUserTab] = useState<'evento' | 'pase' | 'comunidad'>('evento');
  const [eventoSection, setEventoSection] = useState<'inicio' | 'registro' | 'info'>('inicio');
  const [adminTab, setAdminTab] = useState<'kpis' | 'escaner' | 'listado'>('kpis');

  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Formulario Registro Corredor
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [distancia, setDistancia] = useState('10K');
  const [talle, setTalle] = useState('L');

  // KPIs y Listados
  const [kpis, setKpis] = useState<any>({ 
    total_inscriptos: 0, 
    total_acreditados: 0, 
    pendientes_kit: 0, 
    distribucion: { '5K': 0, '10K': 0, '21K': 0 },
    inventario_talles: {}
  });
  const [listaCorredores, setListaCorredores] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchKpis = async () => {
    try {
      const res = await fetch(`${API_URL}/api/kpis`);
      if (res.ok) setKpis(await res.json());
    } catch (e) { console.log("Backend offline"); }
  };

  const fetchListaAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/corredores`);
      if (res.ok) setListaCorredores(await res.json());
    } catch (e) { console.log("Error al cargar lista admin"); }
  };

  useEffect(() => {
    fetchKpis();
    if (isAdminMode) fetchListaAdmin();
  }, [isAdminMode, adminTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchKpis();
    if (isAdminMode) await fetchListaAdmin();
    setRefreshing(false);
  };

  const openInstagram = async (url: string = INSTAGRAM_PROFILE_URL) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(INSTAGRAM_PROFILE_URL);
      }
    } catch (e) {
      Linking.openURL(INSTAGRAM_PROFILE_URL);
    }
  };

  const exportarCSV = () => {
    Linking.openURL(`${API_URL}/api/admin/exportar-csv`);
  };

  const handleAcreditarManual = async (dniCorredor: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/acreditar-manual/${dniCorredor}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("¡Acreditado!", data.mensaje);
        fetchListaAdmin();
        fetchKpis();
      } else {
        Alert.alert("Error", data.detail);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  const handlePinSubmit = () => {
    if (inputPin === '2027') {
      setIsAdminMode(true);
      setPinModalVisible(false);
      setInputPin('');
    } else {
      Alert.alert("Acceso Denegado", "PIN de administrador incorrecto");
      setInputPin('');
    }
  };

  const handleRegistro = async () => {
    if (!nombre || !dni || !email) return Alert.alert('Atención', 'Completa todos los campos');
    try {
      const res = await fetch(`${API_URL}/api/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: nombre, dni, email, distancia, talle_remera: talle })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('¡Inscripción Confirmada!', `Código QR: ${data.qr_code}`);
        setNombre(''); setDni(''); setEmail('');
        fetchKpis();
        setUserTab('pase');
      } else {
        Alert.alert('Error', data.detail || 'Fallo el registro');
      }
    } catch (e) { Alert.alert('Error', 'Sin conexión con el servidor'); }
  };

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const corredoresFiltrados = listaCorredores.filter(c => 
    c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.dni.includes(busqueda)
  );

  // Configurar cómo se comportan las notificaciones al recibirse con la app abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Función para registrar y obtener el token de notificaciones push
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F15A24',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('¡Permiso de notificaciones denegado para alertas de la maratón!');
      return;
    }
    
    // Obtener el token de Expo para este dispositivo
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo Push Token:", token);
    } catch (e) {
      console.log("Error al obtener push token:", e);
    }
  } else {
    alert('Las notificaciones push requieren un dispositivo físico (no funcionan en emulador por defecto)');
  }

  return token;
}

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.black} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        
        {/* Header Superior con Logo Oficial */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image 
              source={require('./assets/icon.png')} 
              style={styles.logoHeaderImage} 
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>{isAdminMode ? 'STAFF / ADMIN' : 'MARATÓN MIJOVI'}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.roleBtn, isAdminMode && { backgroundColor: Colors.primary }]} 
            onPress={() => isAdminMode ? setIsAdminMode(false) : setPinModalVisible(true)}
          >
            <Ionicons name={isAdminMode ? "exit" : "lock-closed"} size={16} color={Colors.white} />
            <Text style={styles.roleBtnText}>{isAdminMode ? ' Salir Admin' : ' Staff'}</Text>
          </TouchableOpacity>
        </View>

        {/* Modal PIN Admin */}
        <Modal visible={pinModalVisible} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Acceso Personal Autorizado</Text>
              <TextInput 
                style={styles.pinInput} 
                placeholder="PIN (2027)" 
                placeholderTextColor="#888888"
                keyboardType="numeric" 
                secureTextEntry 
                value={inputPin} 
                onChangeText={setInputPin} 
              />
              <View style={styles.row}>
                <TouchableOpacity style={[styles.btnModal, { backgroundColor: Colors.gray }]} onPress={() => setPinModalVisible(false)}>
                  <Text style={styles.btnModalText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnModal, { backgroundColor: Colors.primary }]} onPress={handlePinSubmit}>
                  <Text style={styles.btnModalText}>Ingresar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* CUERPO PRINCIPAL */}
        <View style={styles.body}>
          {!isAdminMode ? (
            // --- VISTAS CORREDOR ---
            <>
              {userTab === 'evento' && (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                  
                  {/* Navegación Interna Home */}
                  <View style={styles.subSegment}>
                    <TouchableOpacity style={[styles.subSegmentBtn, eventoSection === 'inicio' && styles.subSegmentActive]} onPress={() => setEventoSection('inicio')}>
                      <Text style={[styles.subSegmentText, eventoSection === 'inicio' && styles.subSegmentTextActive]}>Inicio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.subSegmentBtn, eventoSection === 'registro' && styles.subSegmentActive]} onPress={() => setEventoSection('registro')}>
                      <Text style={[styles.subSegmentText, eventoSection === 'registro' && styles.subSegmentTextActive]}>Inscripción</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.subSegmentBtn, eventoSection === 'info' && styles.subSegmentActive]} onPress={() => setEventoSection('info')}>
                      <Text style={[styles.subSegmentText, eventoSection === 'info' && styles.subSegmentTextActive]}>Circuitos</Text>
                    </TouchableOpacity>
                  </View>

                  {/* SECCIÓN HOME PRINCIPAL */}
                  {eventoSection === 'inicio' && (
                    <View>
                      {/* Banner Hero con Fecha Confirmada */}
                      <View style={styles.heroCard}>
                        <Text style={styles.heroTag}>EDICIÓN OFICIAL - ABRIL 2027 🏃‍♂️</Text>
                        <Text style={styles.heroTitle}>La Gran Maratón Mijovi S.R.L.</Text>
                        <Text style={styles.heroSub}>5K Recreativo | 10K Media Maratón | 21K Competitivo</Text>
                        <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => setEventoSection('registro')}>
                          <Text style={styles.actionBtnText}>Asegurar Mi Lugar 📝</Text>
                        </TouchableOpacity>
                      </View>

                      {/* BANNER INSTAGRAM Y DESTACADOS */}
                      <View style={styles.instaBanner}>
                        <View style={styles.rowAlign}>
                          <Ionicons name="logo-instagram" size={32} color="#E1306C" />
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.instaHandle}>@maratonmijovi</Text>
                            <Text style={styles.instaSubText}>Comunidad y novedades en vivo</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', marginTop: 10 }}>
                          <TouchableOpacity style={[styles.btnInstaFollow, { flex: 1, marginRight: 4 }]} onPress={() => openInstagram()}>
                            <Text style={styles.btnInstaFollowText}>Perfil IG 📸</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.btnInstaHighlight, { flex: 1, marginLeft: 4 }]} onPress={() => openInstagram(INSTAGRAM_HIGHLIGHTS_URL)}>
                            <Text style={styles.btnInstaHighlightText}>Historias IG 🌟</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* NOVEDADES DESTACADAS DE INSTAGRAM */}
                      <Text style={styles.sectionHeader}>Novedades de la Carrera 🔥</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                        <TouchableOpacity style={styles.instaPostCard} onPress={() => openInstagram()}>
                          <View style={styles.instaCardHeader}>
                            <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                            <Text style={styles.instaCardUser}>maratonmijovi</Text>
                          </View>
                          <Text style={styles.instaPostTitle}>🎁 Sorteo de Kits y Entradas</Text>
                          <Text style={styles.instaPostDesc}>Comenta con tu talle de remera en Instagram y participa del sorteo semanal.</Text>
                          <Text style={styles.instaLinkText}>Ver publicación →</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.instaPostCard} onPress={() => openInstagram()}>
                          <View style={styles.instaCardHeader}>
                            <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                            <Text style={styles.instaCardUser}>maratonmijovi</Text>
                          </View>
                          <Text style={styles.instaPostTitle}>👕 Revelación Remera 2027</Text>
                          <Text style={styles.instaPostDesc}>Diseño exclusivo con tecnología Dri-Fit de secado rápido. ¡Mírala en nuestro Reel!</Text>
                          <Text style={styles.instaLinkText}>Ver Reel →</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.instaPostCard} onPress={() => openInstagram(INSTAGRAM_HIGHLIGHTS_URL)}>
                          <View style={styles.instaCardHeader}>
                            <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                            <Text style={styles.instaCardUser}>maratonmijovi</Text>
                          </View>
                          <Text style={styles.instaPostTitle}>🗺️ Recorrido Oficial en IG</Text>
                          <Text style={styles.instaPostDesc}>Revisa los mapas interactivos y fotos del circuito en las Historias Destacadas.</Text>
                          <Text style={styles.instaLinkText}>Ver Historias →</Text>
                        </TouchableOpacity>
                      </ScrollView>

                      {/* LO QUE INCLUYE EL KIT */}
                      <Text style={styles.sectionHeader}>El Kit de Corredor Incluye</Text>
                      <View style={styles.grid2}>
                        <View style={styles.featureBox}>
                          <Ionicons name="shirt" size={26} color={Colors.primary} />
                          <Text style={styles.featureTitle}>Remera Técnica</Text>
                          <Text style={styles.featureDesc}>Tela respirable oficial del evento.</Text>
                        </View>
                        <View style={styles.featureBox}>
                          <Ionicons name="ribbon" size={26} color={Colors.primary} />
                          <Text style={styles.featureTitle}>Medalla Finisher</Text>
                          <Text style={styles.featureDesc}>Reconocimiento al cruzar la meta.</Text>
                        </View>
                        <View style={styles.featureBox}>
  <Ionicons name="card" size={26} color={Colors.primary} />
  <Text style={styles.featureTitle}>Dorsal Oficial</Text>
  <Text style={styles.featureDesc}>Número de identificación para el corredor.</Text>
</View>
                        <View style={styles.featureBox}>
                          <Ionicons name="water" size={26} color={Colors.primary} />
                          <Text style={styles.featureTitle}>Hidratación</Text>
                          <Text style={styles.featureDesc}>Puestos de agua y frutas cada 2.5 KM.</Text>
                        </View>
                      </View>

                      {/* TESTIMONIOS Y OPINIONES DE ATLETAS */}
                      <Text style={styles.sectionHeader}>Experiencia de los Atletas 💬</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                        <View style={styles.testimonialCardScroll}>
                          <View style={styles.rowAlign}>
                            <Ionicons name="person-circle" size={32} color={Colors.primary} />
                            <View style={{ marginLeft: 8 }}>
                              <Text style={styles.testimonialUser}>Gonzalo Ramírez</Text>
                              <Text style={styles.testimonialDist}>Atleta 21K | ⭐⭐⭐⭐⭐</Text>
                            </View>
                          </View>
                          <Text style={styles.testimonialText}>
                            "Excelente organización y un circuito super rápido. Acreditarme con el código QR desde la app me tomó menos de 30 segundos."
                          </Text>
                        </View>

                        <View style={styles.testimonialCardScroll}>
                          <View style={styles.rowAlign}>
                            <Ionicons name="person-circle" size={32} color="#E1306C" />
                            <View style={{ marginLeft: 8 }}>
                              <Text style={styles.testimonialUser}>Mariana Gómez</Text>
                              <Text style={styles.testimonialDist}>Atleta 10K | ⭐⭐⭐⭐⭐</Text>
                            </View>
                          </View>
                          <Text style={styles.testimonialText}>
                            "La remera oficial es de primer nivel. Los puestos de agua impecables y el ambiente en la meta fue una fiesta."
                          </Text>
                        </View>

                        <View style={styles.testimonialCardScroll}>
                          <View style={styles.rowAlign}>
                            <Ionicons name="person-circle" size={32} color="#28A745" />
                            <View style={{ marginLeft: 8 }}>
                              <Text style={styles.testimonialUser}>Luciano Soria</Text>
                              <Text style={styles.testimonialDist}>Atleta 5K | ⭐⭐⭐⭐⭐</Text>
                            </View>
                          </View>
                          <Text style={styles.testimonialText}>
                            "Corrí mi primera maratón en familia. El trazado de 5K es muy cómodo y seguro para disfrutar corriendo."
                          </Text>
                        </View>
                      </ScrollView>

                      {/* PREGUNTAS FRECUENTES (FAQ) */}
                      <Text style={styles.sectionHeader}>Preguntas Frecuentes (FAQ)</Text>
                      {[
                        { q: "¿Cuándo se realiza el evento?", a: "La Gran Maratón Mijovi S.R.L. se llevará a cabo en Abril de 2027." },
                        { q: "¿Cuándo y dónde se retiran los kits?", a: "La entrega de kits se realiza el día previo al evento en el Centro de Exposiciones de 09:00 a 18:00 hs presentando DNI y el Pase Digital QR." },
                        { q: "¿Se requiere certificado médico?", a: "Sí, es obligatorio presentar el certificado médico de aptitud física para las distancias de 10K y 21K." },
                        { q: "¿Puedo modificar mi distancia una vez inscripto?", a: "Sí, puedes cambiar tu categoría desde la pestaña 'Mi Pase' de la app antes de retirar tu kit." }
                      ].map((item, idx) => (
                        <TouchableOpacity key={idx} style={styles.faqItem} onPress={() => toggleFaq(idx)}>
                          <View style={styles.faqHeader}>
                            <Text style={styles.faqQuestion}>{item.q}</Text>
                            <Ionicons name={faqOpen === idx ? "chevron-up" : "chevron-down"} size={18} color={Colors.primary} />
                          </View>
                          {faqOpen === idx && <Text style={styles.faqAnswer}>{item.a}</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* SECCIÓN REGISTRO (CON INPUTS CORREGIDOS) */}
                  {eventoSection === 'registro' && (
                    <View>
                      <Text style={styles.sectionHeader}>Inscripción - Abril 2027</Text>
                      <TextInput 
                        style={styles.input} 
                        placeholder="Nombre Completo" 
                        placeholderTextColor="#888888" 
                        value={nombre} 
                        onChangeText={setNombre} 
                      />
                      <TextInput 
                        style={styles.input} 
                        placeholder="DNI (sin puntos)" 
                        placeholderTextColor="#888888" 
                        keyboardType="numeric" 
                        value={dni} 
                        onChangeText={setDni} 
                      />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Correo Electrónico" 
                        placeholderTextColor="#888888" 
                        keyboardType="email-address" 
                        value={email} 
                        onChangeText={setEmail} 
                      />
                      
                      <Text style={styles.label}>Distancia:</Text>
                      <View style={styles.row}>
                        {['5K', '10K', '21K'].map((d) => (
                          <TouchableOpacity key={d} style={[styles.chip, distancia === d && styles.chipActive]} onPress={() => setDistancia(d)}>
                            <Text style={[styles.chipText, distancia === d && styles.chipTextActive]}>{d}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.label}>Talle de Remera Oficial:</Text>
                      <View style={styles.row}>
                        {['S', 'M', 'L', 'XL', 'XXL'].map((t) => (
                          <TouchableOpacity key={t} style={[styles.chip, talle === t && styles.chipActive]} onPress={() => setTalle(t)}>
                            <Text style={[styles.chipText, talle === t && styles.chipTextActive]}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleRegistro}>
                        <Text style={styles.actionBtnText}>Confirmar e Inscribirme 🚀</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* SECCIÓN CIRCUITOS Y RECORRIDOS (FOTOS ATLETISMO) */}
                  {eventoSection === 'info' && (
                    <View>
                      <Text style={styles.sectionHeader}>Circuitos Oficiales - Abril 2027</Text>

                      {/* Tarjeta 5K */}
<TouchableOpacity style={styles.circuitCard} onPress={() => openInstagram(INSTAGRAM_HIGHLIGHTS_URL)}>
  <Image 
    source={require('./assets/circuitos/5k.jpg')} 
    style={styles.circuitImage} 
  />
  <View style={styles.circuitBody}>
    <View style={styles.rowBetween}>
      <Text style={styles.circuitTitle}>Circuito 5K Participativo</Text>
      <Text style={styles.circuitBadge}>Largada 08:30 HS</Text>
    </View>
    <Text style={styles.circuitDesc}>Trazado recreativo, totalmente plano y seguro sobre la avenida principal. Ideal para familias, principiantes o caminantes.</Text>

    <View style={styles.techDataGrid}>
      <View style={styles.techDataItem}>
        <Ionicons name="trending-up" size={14} color={Colors.primary} />
        <Text style={styles.techDataText}>Altimetría: +15m (Plano)</Text>
      </View>
      <View style={styles.techDataItem}>
        <Ionicons name="water" size={14} color={Colors.primary} />
        <Text style={styles.techDataText}>Hidratación: KM 2.5 y Meta</Text>
      </View>
    </View>
    <Text style={styles.instaLinkCircuitText}>Ver fotos del recorrido en Instagram →</Text>
  </View>
</TouchableOpacity>

{/* Tarjeta 10K */}
<TouchableOpacity style={styles.circuitCard} onPress={() => openInstagram(INSTAGRAM_HIGHLIGHTS_URL)}>
  <Image 
    source={require('./assets/circuitos/10k.jpg')} 
    style={styles.circuitImage} 
  />
  <View style={styles.circuitBody}>
    <View style={styles.rowBetween}>
      <Text style={styles.circuitTitle}>Circuito 10K Competitivo</Text>
      <Text style={styles.circuitBadge}>Largada 08:00 HS</Text>
    </View>
    <Text style={styles.circuitDesc}>Recorrido homologado con retornos señalizados y medición por chip. Asfalto rápido para mejorar marca personal.</Text>

    <View style={styles.techDataGrid}>
      <View style={styles.techDataItem}>
        <Ionicons name="trending-up" size={14} color={Colors.primary} />
        <Text style={styles.techDataText}>Altimetría: +45m</Text>
      </View>
      <View style={styles.techDataItem}>
        <Ionicons name="water" size={14} color={Colors.primary} />
        <Text style={styles.techDataText}>Hidratación: KM 2.5, 5, 7.5 y Meta</Text>
      </View>
    </View>
    <Text style={styles.instaLinkCircuitText}>Ver fotos del recorrido en Instagram →</Text>
  </View>
</TouchableOpacity>

{/* Tarjeta 21K */}
<TouchableOpacity style={styles.circuitCard} onPress={() => openInstagram(INSTAGRAM_HIGHLIGHTS_URL)}>
  <Image 
    source={require('./assets/circuitos/21k.jpg')} 
    style={styles.circuitImage} 
  />
  <View style={styles.circuitBody}>
    <View style={styles.rowBetween}>
      <Text style={styles.circuitTitle}>Circuito 21K Media Maratón</Text>
      <Text style={styles.circuitBadge}>Largada 07:30 HS</Text>
    </View>
    <Text style={styles.circuitDesc}>Desafío principal del evento. Recorrido panorámico con paso por el centro histórico, parque central y zonas de animación.</Text>

    <View style={styles.techDataGrid}>
      <View style={styles.techDataItem}>
        <Ionicons name="trending-up" size={14} color={Colors.primary} />
        <Text style={styles.techDataText}>Altimetría: +110m (Moderado)</Text>
      </View>
      <View style={styles.techDataItem}>
        <Ionicons name="water" size={14} color={Colors.primary} />
        <Text style={styles.techDataText}>Puestos cada 2.5 KM + Isotónicas</Text>
      </View>
    </View>
    <Text style={styles.instaLinkCircuitText}>Ver fotos del recorrido en Instagram →</Text>
  </View>
</TouchableOpacity>

<TouchableOpacity style={styles.btnInstaStoryLink} onPress={() => openInstagram(INSTAGRAM_HIGHLIGHTS_URL)}>
  <Ionicons name="logo-instagram" size={20} color={Colors.white} style={{ marginRight: 8 }} />
  <Text style={styles.actionBtnText}>Ver Historias Destacadas del Circuito 🌟</Text>
</TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              )}

              {userTab === 'pase' && <PerfilScreen />}

              {/* SECCIÓN COMUNIDAD */}
              {userTab === 'comunidad' && (
                <View style={{ flex: 1 }}>
                  {!showCameraInCommunity ? (
                    <>
                      <View style={{ padding: 10 }}>
                        <TouchableOpacity style={styles.actionBtnDark} onPress={() => setShowCameraInCommunity(true)}>
                          <Ionicons name="camera" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                          <Text style={styles.actionBtnText}>Sacar Foto con Marco Oficial 📸</Text>
                        </TouchableOpacity>
                      </View>
                      <CommunityFeedScreen />
                    </>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity style={styles.btnVolverFeed} onPress={() => setShowCameraInCommunity(false)}>
                        <Ionicons name="arrow-back" size={20} color={Colors.white} />
                        <Text style={styles.btnVolverText}>Volver al Muro</Text>
                      </TouchableOpacity>
                      <CameraScreen />
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            // --- VISTAS ADMINISTRADOR / STAFF AMPLIA ---
            <>
              {adminTab === 'kpis' && (
                <ScrollView 
                  contentContainerStyle={styles.scrollContent}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                >
                  <Text style={styles.sectionHeader}>Panel de Control & Stock Staff</Text>
                  
                  <View style={styles.row}>
                    <View style={[styles.kpiCardHalf, { backgroundColor: Colors.primary }]}>
                      <Text style={styles.kpiCardLabelLight}>INSCRIPTOS</Text>
                      <Text style={styles.kpiValueWhite}>{kpis.total_inscriptos}</Text>
                    </View>
                    <View style={[styles.kpiCardHalf, { backgroundColor: '#28A745' }]}>
                      <Text style={styles.kpiCardLabelLight}>KITS ENTREGADOS</Text>
                      <Text style={styles.kpiValueWhite}>{kpis.total_acreditados}</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionHeader}>Stock de Remeras (Entregados / Solicitados)</Text>
                  <View style={styles.inventoryCard}>
                    {Object.keys(kpis.inventario_talles || {}).map((talleKey) => {
                      const item = kpis.inventario_talles[talleKey];
                      return (
                        <View key={talleKey} style={styles.inventoryRow}>
                          <Text style={styles.talleBadge}>Talle {talleKey}</Text>
                          <Text style={styles.inventoryDetail}>
                            Entregados: <Text style={{ fontWeight: 'bold', color: '#28A745' }}>{item.entregados}</Text> / {item.solicitados}
                          </Text>
                          <Text style={styles.pendingBadge}>Quedan: {item.pendientes}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.btnCsvExport} onPress={exportarCSV}>
                    <Ionicons name="download-sharp" size={18} color={Colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Exportar Padrón en Excel/CSV 📊</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {adminTab === 'escaner' && (
                <AdminScannerScreen 
                  onAcreditadoSuccess={() => {
                    fetchKpis();
                    fetchListaAdmin();
                  }} 
                />
              )}

              {adminTab === 'listado' && (
                <View style={{ flex: 1, padding: 15 }}>
                  <Text style={styles.sectionHeader}>Buscador / Acreditación Manual</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="🔍 Buscar por Nombre o DNI..." 
                    placeholderTextColor="#888888"
                    value={busqueda}
                    onChangeText={setBusqueda}
                  />

                  <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}>
                    {corredoresFiltrados.map((c) => (
                      <View key={c.id} style={styles.listRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listName}>{c.nombre_completo}</Text>
                          <Text style={styles.listDetail}>DNI: {c.dni} | Cat: {c.distancia} | Talle: {c.talle_remera}</Text>
                        </View>
                        
                        {!c.acreditado ? (
                          <TouchableOpacity 
                            style={[styles.statusBadge, { backgroundColor: Colors.primary }]}
                            onPress={() => handleAcreditarManual(c.dni)}
                          >
                            <Text style={styles.statusText}>Acreditar Manual</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.statusBadge, { backgroundColor: '#28A745' }]}>
                            <Text style={styles.statusText}>Entregado ✅</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>

        {/* Menu Inferior */}
        <View style={styles.bottomNav}>
          {!isAdminMode ? (
            <>
              <TouchableOpacity style={styles.navTab} onPress={() => { setUserTab('evento'); setShowCameraInCommunity(false); }}>
                <Ionicons name={userTab === 'evento' ? 'trophy' : 'trophy-outline'} size={22} color={userTab === 'evento' ? Colors.primary : Colors.gray} />
                <Text style={[styles.navTabText, userTab === 'evento' && styles.navTabTextActive]}>Inicio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navTab} onPress={() => { setUserTab('pase'); setShowCameraInCommunity(false); }}>
                <Ionicons name={userTab === 'pase' ? 'qr-code' : 'qr-code-outline'} size={22} color={userTab === 'pase' ? Colors.primary : Colors.gray} />
                <Text style={[styles.navTabText, userTab === 'pase' && styles.navTabTextActive]}>Mi Pase</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navTab} onPress={() => setUserTab('comunidad')}>
                <Ionicons name={userTab === 'comunidad' ? 'images' : 'images-outline'} size={22} color={userTab === 'comunidad' ? Colors.primary : Colors.gray} />
                <Text style={[styles.navTabText, userTab === 'comunidad' && styles.navTabTextActive]}>Comunidad</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.navTab} onPress={() => setAdminTab('kpis')}>
                <Ionicons name={adminTab === 'kpis' ? 'analytics' : 'analytics-outline'} size={22} color={adminTab === 'kpis' ? Colors.primary : Colors.gray} />
                <Text style={[styles.navTabText, adminTab === 'kpis' && styles.navTabTextActive]}>Métricas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navTab} onPress={() => setAdminTab('escaner')}>
                <Ionicons name={adminTab === 'escaner' ? 'camera' : 'camera-outline'} size={22} color={adminTab === 'escaner' ? Colors.primary : Colors.gray} />
                <Text style={[styles.navTabText, adminTab === 'escaner' && styles.navTabTextActive]}>Escanear Kit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navTab} onPress={() => setAdminTab('listado')}>
                <Ionicons name={adminTab === 'listado' ? 'list' : 'list-outline'} size={22} color={adminTab === 'listado' ? Colors.primary : Colors.gray} />
                <Text style={[styles.navTabText, adminTab === 'listado' && styles.navTabTextActive]}>Corredores</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: { backgroundColor: Colors.black, paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  logoHeaderImage: { width: 32, height: 32, borderRadius: 6, marginRight: 10 },
  headerTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  roleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  roleBtnText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  body: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16 },
  subSegment: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 10, padding: 4, marginBottom: 15 },
  subSegmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  subSegmentActive: { backgroundColor: Colors.primary },
  subSegmentText: { fontWeight: 'bold', color: Colors.black, fontSize: 12 },
  subSegmentTextActive: { color: Colors.white },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: Colors.black, marginVertical: 12 },
  heroCard: { backgroundColor: Colors.black, padding: 20, borderRadius: 12, marginBottom: 12 },
  heroTag: { color: Colors.primary, fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  heroTitle: { color: Colors.white, fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  heroSub: { color: '#AAA', fontSize: 13, marginBottom: 15 },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  instaBanner: { backgroundColor: Colors.white, padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  instaHandle: { fontWeight: 'bold', color: Colors.black, fontSize: 15 },
  instaSubText: { color: Colors.gray, fontSize: 11 },
  btnInstaFollow: { backgroundColor: '#E1306C', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnInstaFollowText: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  btnInstaHighlight: { backgroundColor: Colors.black, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnInstaHighlightText: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  instaPostCard: { backgroundColor: Colors.white, padding: 14, borderRadius: 10, width: 240, marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  instaCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  instaCardUser: { fontSize: 11, fontWeight: 'bold', color: Colors.black, marginLeft: 5 },
  instaPostTitle: { fontWeight: 'bold', fontSize: 13, color: Colors.black, marginBottom: 4 },
  instaPostDesc: { color: Colors.gray, fontSize: 11, marginBottom: 8 },
  instaLinkText: { color: '#E1306C', fontWeight: 'bold', fontSize: 11 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  featureBox: { width: '48%', backgroundColor: Colors.white, padding: 14, borderRadius: 10, marginBottom: 10 },
  featureTitle: { fontWeight: 'bold', color: Colors.black, marginTop: 8, fontSize: 13 },
  featureDesc: { color: Colors.gray, fontSize: 11, marginTop: 2 },
  testimonialCardScroll: { backgroundColor: Colors.white, padding: 14, borderRadius: 10, width: 260, marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  testimonialUser: { fontWeight: 'bold', color: Colors.black, fontSize: 13 },
  testimonialDist: { color: Colors.primary, fontSize: 11, fontWeight: 'bold' },
  testimonialText: { color: Colors.gray, fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  circuitCard: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  circuitImage: { width: '100%', height: 160 },
  circuitBody: { padding: 14 },
  circuitTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.black },
  circuitBadge: { backgroundColor: Colors.primary, color: Colors.white, fontWeight: 'bold', fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  circuitDesc: { color: Colors.gray, fontSize: 12, marginTop: 6, marginBottom: 10 },
  techDataGrid: { backgroundColor: Colors.background, padding: 10, borderRadius: 8 },
  techDataItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  techDataText: { fontSize: 11, color: Colors.black, fontWeight: 'bold', marginLeft: 6 },
  instaLinkCircuitText: { color: '#E1306C', fontWeight: 'bold', fontSize: 11, marginTop: 10, textAlign: 'right' },
  btnInstaStoryLink: { backgroundColor: '#E1306C', flexDirection: 'row', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  faqItem: { backgroundColor: Colors.white, padding: 14, borderRadius: 8, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontWeight: 'bold', fontSize: 13, color: Colors.black, flex: 1 },
  faqAnswer: { color: Colors.gray, fontSize: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 8 },
  kpiCardLabelLight: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 'bold' },
  kpiValueWhite: { color: Colors.white, fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  kpiCardHalf: { flex: 1, padding: 15, borderRadius: 12, marginHorizontal: 2 },
  inventoryCard: { backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  talleBadge: { fontWeight: 'bold', color: Colors.black, width: 70 },
  inventoryDetail: { fontSize: 12, color: Colors.black },
  pendingBadge: { fontSize: 11, color: Colors.gray, fontWeight: 'bold' },
  btnCsvExport: { backgroundColor: Colors.black, flexDirection: 'row', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnDark: { backgroundColor: Colors.black, flexDirection: 'row', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  btnVolverFeed: { backgroundColor: Colors.black, flexDirection: 'row', padding: 10, alignItems: 'center' },
  btnVolverText: { color: Colors.white, fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
  input: { 
    backgroundColor: '#FFFFFF', 
    color: '#111111', 
    fontSize: 15, 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#CCCCCC', 
    marginBottom: 12 
  },
  label: { fontSize: 13, fontWeight: 'bold', color: Colors.black, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  chip: { flex: 1, padding: 10, borderWidth: 1, borderColor: Colors.gray, borderRadius: 8, alignItems: 'center', marginHorizontal: 2, backgroundColor: Colors.white },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.black, fontWeight: 'bold' },
  chipTextActive: { color: Colors.white },
  infoCard: { backgroundColor: Colors.white, flexDirection: 'row', padding: 15, borderRadius: 10, alignItems: 'center' },
  infoTitle: { fontWeight: 'bold', fontSize: 14, color: Colors.black },
  infoDesc: { color: Colors.gray, fontSize: 12 },
  listRow: { backgroundColor: Colors.white, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listName: { fontWeight: 'bold', fontSize: 14, color: Colors.black },
  listDetail: { color: Colors.gray, fontSize: 11 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  statusText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  bottomNav: { flexDirection: 'row', backgroundColor: Colors.black, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#222' },
  navTab: { flex: 1, alignItems: 'center' },
  navTabText: { color: Colors.gray, fontSize: 10, marginTop: 2 },
  navTabTextActive: { color: Colors.primary, fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: Colors.white, padding: 20, borderRadius: 12, width: '80%', alignItems: 'center' },
  modalTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 15, color: Colors.black },
  pinInput: { 
    backgroundColor: '#F8F9FA', 
    color: '#111111', 
    borderWidth: 1, 
    borderColor: '#CCCCCC', 
    width: '100%', 
    padding: 12, 
    borderRadius: 8, 
    textAlign: 'center', 
    fontSize: 20, 
    fontWeight: 'bold',
    letterSpacing: 5, 
    marginBottom: 15 
  },
  btnModal: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  btnModalText: { color: Colors.white, fontWeight: 'bold' }
});