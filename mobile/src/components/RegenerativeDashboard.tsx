import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function RegenerativeDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const ndviData = {
    labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'],
    datasets: [
      {
        data: [0.3, 0.45, 0.7, 0.85, 0.6, 0.4],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  const carbonData = {
    labels: ['Carbon Seq.'],
    data: [0.65] // 65% of target
  };

  // Mock plot coordinates
  const plotCoordinates = [
    { latitude: 20.5937, longitude: 78.9629 },
    { latitude: 20.5940, longitude: 78.9635 },
    { latitude: 20.5932, longitude: 78.9640 },
    { latitude: 20.5928, longitude: 78.9632 },
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.headerTitle}>Regenerative Dashboard</Text>
      
      {/* Map View */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plot NDVI Overview</Text>
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={[styles.map, {justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0'}]}>
               <Text>Interactive Map Available in Mobile App</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* NDVI Trend Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NDVI Trend (12 Months)</Text>
        <View style={{height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 16, marginVertical: 8}}>
          <Text>Chart Available in Mobile App</Text>
        </View>
      </View>

      {/* Soil Health Score */}
      <View style={styles.row}>
        <View style={[styles.card, { flex: 1, marginRight: 8, alignItems: 'center' }]}>
          <Text style={styles.cardTitle}>Soil Health</Text>
          <Text style={styles.scoreText}>82<Text style={styles.scoreSub}>/100</Text></Text>
          <Text style={styles.statusTextGood}>Excellent</Text>
        </View>
        <View style={[styles.card, { flex: 1, marginLeft: 8, alignItems: 'center' }]}>
          <Text style={styles.cardTitle}>Carbon Target</Text>
          <View style={{height: 100, width: 120, justifyContent: 'center', alignItems: 'center'}}>
             <Text style={{fontWeight: 'bold', fontSize: 18, color: '#2196F3'}}>1850 kg</Text>
             <Text style={{fontSize: 12, color: 'gray'}}>Sequestered</Text>
          </View>
        </View>
      </View>

      {/* Soil Metrics Table */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Soil Metrics</Text>
        <View style={styles.tableRow}><Text style={styles.tableCellLabel}>pH Level</Text><Text style={styles.tableCellVal}>6.5 (Optimal)</Text></View>
        <View style={styles.tableRow}><Text style={styles.tableCellLabel}>Nitrogen (N)</Text><Text style={styles.tableCellVal}>Medium</Text></View>
        <View style={styles.tableRow}><Text style={styles.tableCellLabel}>Phosphorus (P)</Text><Text style={styles.tableCellVal}>High</Text></View>
        <View style={styles.tableRow}><Text style={styles.tableCellLabel}>Potassium (K)</Text><Text style={styles.tableCellVal}>Medium</Text></View>
        <View style={styles.tableRow}><Text style={styles.tableCellLabel}>Organic Matter</Text><Text style={styles.tableCellVal}>3.2%</Text></View>
      </View>

      {/* Crop Rotation Calendar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crop Rotation</Text>
        <View style={styles.seasonRow}>
          <View style={[styles.seasonBadge, {backgroundColor: '#FF9800'}]}><Text style={styles.seasonText}>Kharif</Text><Text style={styles.cropText}>Paddy</Text></View>
          <View style={[styles.seasonBadge, {backgroundColor: '#4CAF50'}]}><Text style={styles.seasonText}>Rabi</Text><Text style={styles.cropText}>Wheat</Text></View>
          <View style={[styles.seasonBadge, {backgroundColor: '#03A9F4'}]}><Text style={styles.seasonText}>Zaid</Text><Text style={styles.cropText}>Moong</Text></View>
        </View>
      </View>

      {/* Recommendations & Weather */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Water Conservation</Text>
        <View style={styles.recommendationItem}>
          <Icon name="water" size={24} color="#03A9F4" />
          <Text style={styles.recText}>Implement drip irrigation for next season to save 30% water.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Biodiversity Index</Text>
        <View style={styles.recommendationItem}>
          <Icon name="flower" size={24} color="#E91E63" />
          <Text style={styles.recText}>High: Intercropping with marigold observed.</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginVertical: 10,
    marginLeft: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scoreSub: {
    fontSize: 20,
    color: '#757575',
  },
  statusTextGood: {
    color: '#388E3C',
    fontWeight: 'bold',
    marginTop: 5,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tableCellLabel: {
    color: '#555',
    fontSize: 16,
  },
  tableCellVal: {
    fontWeight: '600',
    color: '#333',
    fontSize: 16,
  },
  seasonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  seasonBadge: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  seasonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cropText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  recText: {
    marginLeft: 10,
    flex: 1,
    color: '#444',
    lineHeight: 20,
  }
});
