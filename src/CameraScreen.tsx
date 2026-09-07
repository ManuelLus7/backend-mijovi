import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ImageBackground, ActivityIndicator } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../colors';

const API_URL = 'https://backend-mijovi-production.up.railway.app';

export default function CameraScreen() {
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Previas 🏃');
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);

  const categoriasDisponibles = ['Previas 🏃', 'Carrera 🏁', 'Medallas 🏅'];

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ textAlign: 'center', marginBottom: 15, color: Colors.black }}>Necesitamos acceso a tu cámara para las fotos del muro.</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
        setCapturedImage(photo.uri);
      } catch (e) {
        Alert.alert("Error", "No se pudo capturar la foto");
      }
    }
  };

  const publicarFoto = async () => {
    if (!capturedImage) return;
    setLoading(true);
    try {
      // Simulación de subida de imagen y envío a la API
      const res = await fetch(`${API_URL}/api/fotos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_nombre: "Corredor Mijovi",
          imagen_url: capturedImage,
          categoria: categoriaSeleccionada
        })
      });

      if (res.ok) {
        Alert.alert("¡Éxito! 🎉", "Foto publicada correctamente en el muro.");
        setCapturedImage(null);
      } else {
        Alert.alert("Error", "No se pudo publicar la foto en el servidor.");
      }
    } catch (e) {
      Alert.alert("Error de red", "Verifica tu conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!capturedImage ? (
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.overlayFrame}>
            <View style={styles.watermark}>
              <Text style={styles.watermarkText}>MARATÓN MIJOVI 2027 🏅</Text>
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <ImageBackground source={{ uri: capturedImage }} style={styles.preview}>
          <View style={styles.previewOverlay}>
            <Text style={styles.previewTitle}>Clasifica tu foto para el Muro:</Text>
            <View style={styles.chipRow}>
              {categoriasDisponibles.map((cat) => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.catChip, categoriaSeleccionada === cat && styles.catChipActive]}
                  onPress={() => setCategoriaSeleccionada(cat)}
                >
                  <Text style={[styles.catChipText, categoriaSeleccionada === cat && styles.catChipActiveText]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.btnDiscard} onPress={() => setCapturedImage(null)}>
                <Text style={styles.btnTextDark}>Tomar Otra</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPublish} onPress={publicarFoto} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Publicar 🚀</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  camera: { flex: 1 },
  overlayFrame: { flex: 1, borderWidth: 20, borderColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 30 },
  watermark: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  watermarkText: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  buttonContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  captureBtn: { width: 75, height: 75, borderRadius: 38, borderWidth: 4, borderColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary },
  preview: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  previewOverlay: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  previewTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 15, marginBottom: 12, textAlign: 'center' },
  chipRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#333', borderWidth: 1, borderColor: '#555' },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { color: Colors.gray, fontWeight: 'bold', fontSize: 12 },
  catChipActiveText: { color: Colors.white },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between' },
  btnDiscard: { flex: 1, backgroundColor: '#DDD', padding: 14, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  btnPublish: { flex: 1, backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginLeft: 8 },
  btnText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  btnTextDark: { color: Colors.black, fontWeight: 'bold', fontSize: 14 },
  btnPermiso: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8 }
});