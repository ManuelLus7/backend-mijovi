import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../colors';

interface AdminScannerProps {
  onAcreditadoSuccess?: () => void;
}

export default function AdminScannerScreen({ onAcreditadoSuccess }: AdminScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastCorredor, setLastCorredor] = useState<any>(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.containerCenter}>
        <Text style={styles.infoText}>Permiso de cámara necesario para acreditación</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setLoading(true);

    try {
      const response = await fetch('https://api-maraton-mijovi.onrender.com/api/admin/acreditar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: data })
      });

      const resData = await response.json();

      if (response.ok) {
        setLastCorredor(resData.corredor);
        Alert.alert('✅ ¡Acreditado!', `Corredor: ${resData.corredor.nombre}\nDistancia: ${resData.corredor.distancia}\nTalle: ${resData.corredor.talle}`);
        
        // Notificar a App.tsx para refrescar datos de inmediato
        if (onAcreditadoSuccess) {
          onAcreditadoSuccess();
        }
      } else {
        Alert.alert('❌ Error', resData.detail || 'Código no válido o ya acreditado');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo contactar al servidor de acreditación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo Organizador: Acreditaciones</Text>
      
      {!scanned ? (
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          <View style={styles.overlayContainer} pointerEvents="none">
            <View style={styles.overlayFrame} />
          </View>
        </View>
      ) : (
        <View style={styles.scannedBox}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <>
              {lastCorredor && (
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{lastCorredor.nombre}</Text>
                  <Text style={styles.cardDetail}>DNI: {lastCorredor.dni}</Text>
                  <Text style={styles.cardDetail}>Distancia: {lastCorredor.distancia}</Text>
                  <Text style={styles.cardDetail}>Talle Remera: {lastCorredor.talle}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)}>
                <Text style={styles.btnText}>Escanear Nuevo QR</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black, padding: 15 },
  containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.black },
  title: { color: Colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  infoText: { color: Colors.white, marginBottom: 15 },
  scannerContainer: { flex: 1, position: 'relative' },
  overlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  overlayFrame: { width: 220, height: 220, borderWidth: 3, borderColor: Colors.primary, borderRadius: 12, backgroundColor: 'transparent' },
  scannedBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardInfo: { backgroundColor: Colors.white, padding: 20, borderRadius: 12, width: '100%', marginBottom: 20 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black, marginBottom: 10 },
  cardDetail: { fontSize: 16, color: Colors.black, marginVertical: 2 },
  btn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: Colors.white, fontWeight: 'bold' }
});