import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const FilterHeader: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={20} color="#555" style={styles.searchIcon} />
        <TextInput 
          placeholder="Search applicants..." 
          placeholderTextColor="#444" 
          style={styles.searchInput}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>Any status</Text>
          <Ionicons name="chevron-down" size={14} color="#A8A8A8" style={styles.chevron} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>Date</Text>
          <Ionicons name="chevron-down" size={14} color="#A8A8A8" style={styles.chevron} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>Payment</Text>
          <Ionicons name="chevron-down" size={14} color="#A8A8A8" style={styles.chevron} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    width: '100%',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 16,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 6,
  },
});
