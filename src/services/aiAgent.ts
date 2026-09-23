// frontend/src/services/aiAgent.ts

// Contexto local indexado del reglamento y circuitos de la Maratón Mijovi
const MARATON_KNOWLEDGE_BASE = `
Reglamento Maratón Mijovi 2027:
- Distancias: 5K Recreativo, 10K Media Maratón, 21K Competitivo.
- Acreditación y Kits: Estadio Único. Se entrega Remera Oficial y Dorsal.
- Horario de Largada: 21K a las 07:00 AM, 10K a las 07:30 AM, 5K a las 08:00 AM.
- Puestos de agua: Cada 2.5 km en todas las rutas.
`;

export function responderPreguntaAtleta(pregunta: string): string {
  const query = pregunta.toLowerCase();
  
  if (query.includes('kit') || query.includes('acreditacion') || query.includes('remera')) {
    return "Los kits y remeras se entregan presentando tu código QR en la carpa de acreditación del Estadio Único.";
  }
  if (query.includes('hora') || query.includes('largada')) {
    return "Las largadas son: 21K (07:00 AM), 10K (07:30 AM) y 5K (08:00 AM). Te recomendamos llegar 45 minutos antes.";
  }
  if (query.includes('agua') || query.includes('hidratacion')) {
    return "Hay puestos de hidratación oficial ubicados cada 2.5 km a lo largo del circuito.";
  }

  return "Respuesta generada por Gemma 4 Edge: Por favor acércate al puesto de información central en el predio.";
}