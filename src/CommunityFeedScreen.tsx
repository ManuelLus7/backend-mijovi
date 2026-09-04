import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Image, RefreshControl, 
  TouchableOpacity, Modal, ActivityIndicator, Linking 
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../colors';

const API_URL = 'https://backend-mijovi-production.up.railway.app'; // Ajustar según IP/Dominio

export default function CommunityFeedScreen() {
  const [tabActiva, setTabActiva] = useState<'oficiales' | 'participantes'>('oficiales');
  
  // Muro Comunitario
  const [fotos, setFotos] = useState<any[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const categorias = ['Todos', 'Previas 🏃', 'Carrera 🏁', 'Medallas 🏅'];

  // Google Fotos Oficiales
  const [albumesOficiales, setAlbumesOficiales] = useState<any[]>([]);
  const [selectedGoogleUrl, setSelectedGoogleUrl] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const fetchFotos = async () => {
    try {
      const url = categoriaActiva === 'Todos' 
        ? `${API_URL}/api/fotos` 
        : `${API_URL}/api/fotos?categoria=${encodeURIComponent(categoriaActiva)}`;
      const res = await fetch(url);
      if (res.ok) setFotos(await res.json());
    } catch (e) {
      console.log("Error al cargar fotos comunitarias");
    }
  };

  const fetchAlbumesOficiales = async () => {
    try {
      const res = await fetch(`${API_URL}/api/albumes-oficiales`);
      if (res.ok) setAlbumesOficiales(await res.json());
    } catch (e) {
      console.log("Error al cargar álbumes oficiales");
    }
  };

  useEffect(() => {
    if (tabActiva === 'participantes') {
      fetchFotos();
    } else {
      fetchAlbumesOficiales();
    }
  }, [tabActiva, categoriaActiva]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (tabActiva === 'participantes') {
      await fetchFotos();
    } else {
      await fetchAlbumesOficiales();
    }
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* PESTAÑAS DUALES */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity 
          style={[styles.segmentBtn, tabActiva === 'oficiales' && styles.segmentBtnActive]}
          onPress={() => setTabActiva('oficiales')}
        >
          <Ionicons name="images" size={16} color={tabActiva === 'oficiales' ? Colors.white : Colors.black} />
          <Text style={[styles.segmentText, tabActiva === 'oficiales' && styles.segmentTextActive]}>
            Álbumes Oficiales HD
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.segmentBtn, tabActiva === 'participantes' && styles.segmentBtnActive]}
          onPress={() => setTabActiva('participantes')}
        >
          <Ionicons name="people" size={16} color={tabActiva === 'participantes' ? Colors.white : Colors.black} />
          <Text style={[styles.segmentText, tabActiva === 'participantes' && styles.segmentTextActive]}>
            Muro Corredores
          </Text>
        </TouchableOpacity>
      </View>

      {/* ÁLBUMES OFICIALES (GOOGLE PHOTOS INTEGRATION) */}
      {tabActiva === 'oficiales' && (
        <FlatList
          data={albumesOficiales}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          renderItem={({ item }) => (
            <View style={styles.officialCard}>
              <Image source={{ uri: item.portada_url }} style={styles.officialCover} />
              <View style={styles.officialCardBody}>
                <Text style={styles.officialTag}>FOTOS OFICIALES • {item.fecha_evento}</Text>
                <Text style={styles.officialTitle}>{item.titulo}</Text>
                <Text style={styles.officialSub}>{item.subtitulo}</Text>
                
                <View style={styles.officialActions}>
                  <TouchableOpacity 
                    style={styles.btnOpenInApp}
                    onPress={() => setSelectedGoogleUrl(item.google_photos_url)}
                  >
                    <Ionicons name="eye" size={16} color={Colors.white} />
                    <Text style={styles.btnTextWhite}> Ver en la App</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.btnOpenExternal}
                    onPress={() => Linking.openURL(item.google_photos_url)}
                  >
                    <Ionicons name="logo-google" size={16} color={Colors.black} />
                    <Text style={styles.btnTextBlack}> Abrir Google Fotos</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cloud-offline" size={40} color={Colors.gray} />
              <Text style={styles.emptyText}>No hay álbumes oficiales cargados aún.</Text>
            </View>
          }
        />
      )}

      {/* MURO PARTICIPANTES */}
      {tabActiva === 'participantes' && (
        <View style={{ flex: 1 }}>
          <View style={styles.albumBar}>
            <FlatList
              data={categorias}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.albumChip, categoriaActiva === item && styles.albumChipActive]}
                  onPress={() => setCategoriaActiva(item)}
                >
                  <Text style={[styles.albumChipText, categoriaActiva === item && styles.albumChipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <FlatList
            data={fotos}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Image source={{ uri: item.imagen_url }} style={styles.image} />
                <View style={styles.footer}>
                  <Text style={styles.user}>{item.usuario_nombre}</Text>
                  <Text style={styles.date}>Maratón Mijovi</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Sé el primero en subir tu foto en {categoriaActiva}</Text>
              </View>
            }
          />
        </View>
      )}

      {/* MODAL WEBVIEW GOOGLE PHOTOS */}
      <Modal visible={!!selectedGoogleUrl} animationType="slide" onRequestClose={() => setSelectedGoogleUrl(null)}>
        <View style={{ flex: 1, backgroundColor: Colors.black }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Galería Oficial de Fotos</Text>
            <TouchableOpacity onPress={() => setSelectedGoogleUrl(null)} style={styles.btnCloseModal}>
              <Ionicons name="close-circle" size={28} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {selectedGoogleUrl && (
            <WebView 
              source={{ uri: selectedGoogleUrl }} 
              startInLoadingState 
              renderLoading={() => <ActivityIndicator color={Colors.primary} size="large" style={StyleSheet.absoluteFillObject} />}
            />
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  segmentContainer: { flexDirection: 'row', padding: 8, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  segmentBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginHorizontal: 4, backgroundColor: '#F0F0F0' },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontWeight: 'bold', fontSize: 12, color: Colors.black, marginLeft: 6 },
  segmentTextActive: { color: Colors.white },
  officialCard: { backgroundColor: Colors.white, marginHorizontal: 12, marginVertical: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#DDD' },
  officialCover: { width: '100%', height: 180, resizeMode: 'cover' },
  officialCardBody: { padding: 14 },
  officialTag: { color: Colors.primary, fontWeight: 'bold', fontSize: 10, marginBottom: 4 },
  officialTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.black, marginBottom: 4 },
  officialSub: { fontSize: 12, color: Colors.gray, marginBottom: 12 },
  officialActions: { flexDirection: 'row', justifyContent: 'space-between' },
  btnOpenInApp: { flex: 1, backgroundColor: Colors.black, flexDirection: 'row', padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  btnOpenExternal: { flex: 1, backgroundColor: '#EFEFEF', flexDirection: 'row', padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 4, borderWidth: 1, borderColor: '#CCC' },
  btnTextWhite: { color: Colors.white, fontWeight: 'bold', fontSize: 11 },
  btnTextBlack: { color: Colors.black, fontWeight: 'bold', fontSize: 11 },
  albumBar: { backgroundColor: Colors.black, paddingVertical: 8, paddingHorizontal: 5 },
  albumChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#222', marginHorizontal: 4 },
  albumChipActive: { backgroundColor: Colors.primary },
  albumChipText: { color: Colors.gray, fontSize: 12, fontWeight: 'bold' },
  albumChipTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.white, marginHorizontal: 10, marginVertical: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#EEE' },
  image: { width: '100%', height: 280, resizeMode: 'cover' },
  footer: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  user: { fontWeight: 'bold', fontSize: 13, color: Colors.black },
  date: { color: Colors.primary, fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.gray, textAlign: 'center', fontSize: 13, marginTop: 10 },
  modalHeader: { height: 50, backgroundColor: Colors.black, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  modalHeaderTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  btnCloseModal: { padding: 4 }
});