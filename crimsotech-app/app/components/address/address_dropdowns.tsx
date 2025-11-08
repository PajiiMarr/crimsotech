"use client";
import React from "react";
import axios from "axios";
import { Label } from "~/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";

// Helper function to ensure unique keys
const getUniqueKey = (item: any, index: number) => {
  return `${item.code}-${index}`;
};

// Define the props interface
interface AddressDropdownsProps {
  errors?: {
    province?: string;
    city?: string;
    barangay?: string;
  };
}

export default function AddressDropdowns({ errors }: AddressDropdownsProps) {
  const [provinces, setProvinces] = React.useState<any[]>([]);
  const [cities, setCities] = React.useState<any[]>([]);
  const [barangays, setBarangays] = React.useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = React.useState<string>("");
  const [selectedCity, setSelectedCity] = React.useState<string>("");
  const [selectedBarangay, setSelectedBarangay] = React.useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  React.useEffect(() => {
    const initializeDefaults = async () => {
      try {
        const provincesRes = await axios.get("https://psgc.gitlab.io/api/provinces/");
        const sortedProvinces = provincesRes.data.sort((a: any, b: any) =>
          a.name.localeCompare(b.name)
        );
        setProvinces(sortedProvinces);
        
        // Ensure no province is selected initially
        setSelectedProvince("");
      } catch (err) {
        console.error("❌ Error initializing defaults:", err);
      } finally {
        setIsInitialLoad(false);
      }
    };

    initializeDefaults();
  }, []);

  const removeDuplicates = (array: any[], key: string) => {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  };

  const handleProvinceChange = async (value: string) => {
    setSelectedProvince(value);
    
    const province = provinces.find(p => p.name === value);
    if (province) {
      try {
        const citiesRes = await axios.get(
          `https://psgc.gitlab.io/api/provinces/${province.code}/cities-municipalities/`
        );
        const uniqueCities = removeDuplicates(citiesRes.data, 'name');
        const sortedCities = uniqueCities.sort((a: any, b: any) =>
          a.name.localeCompare(b.name)
        );
        setCities(sortedCities);
        setSelectedCity("");
        setBarangays([]);
        setSelectedBarangay("");
      } catch (err) {
        console.error("Error fetching cities:", err);
      }
    } else {
      // Clear cities and barangays if no province selected
      setCities([]);
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
    }
  };

  const handleCityChange = async (value: string) => {
    setSelectedCity(value);
    
    const city = cities.find(c => c.name === value);
    if (city) {
      try {
        const barangaysRes = await axios.get(
          `https://psgc.gitlab.io/api/cities-municipalities/${city.code}/barangays/`
        );
        const uniqueBarangays = removeDuplicates(barangaysRes.data, 'name');
        const sortedBarangays = uniqueBarangays.sort((a: any, b: any) =>
          a.name.localeCompare(b.name)
        );
        setBarangays(sortedBarangays);
        setSelectedBarangay("");
      } catch (err) {
        console.error("Error fetching barangays:", err);
      }
    } else {
      // Clear barangays if no city selected
      setBarangays([]);
      setSelectedBarangay("");
    }
  };

  return (
    <div className="grid grid-cols-1 my-2 gap-4 md:grid-cols-3">
      {/* Province */}
      <div className="grid gap-3">
        <div className="flex items-center">
          <Label htmlFor="province">Province</Label>
          {errors?.province && (
            <p className="px-1 text-xs text-red-600">
                {errors.province}
            </p>
          )}
        </div>
        <Select 
          value={selectedProvince} 
          onValueChange={handleProvinceChange} 
          name="province"
        >
          <SelectTrigger id="province" className="w-full">
            <SelectValue placeholder="Select province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              ...
            </SelectItem>
            {provinces.map((province, index) => (
              <SelectItem key={getUniqueKey(province, index)} value={province.name}>
                {province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City / Municipality */}
      <div className="grid gap-3">
        <div className="flex items-center">
          <Label htmlFor="city">City / Municipality</Label>
          {errors?.city && (
            <p className="px-1 text-xs text-red-600">
                {errors.city}
            </p>
          )}
        </div>
        <Select
          value={selectedCity}
          onValueChange={handleCityChange}
          disabled={!selectedProvince}
          name="city"
        >
          <SelectTrigger id="city" className="w-full">
            <SelectValue placeholder="Select city / municipality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              ...
            </SelectItem>
            {cities.map((city, index) => (
              <SelectItem key={getUniqueKey(city, index)} value={city.name}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Barangay */}
      <div className="grid gap-3">
        <div className="flex items-center">
          <Label htmlFor="barangay">Barangay</Label>
          {errors?.barangay && (
            <p className="px-1 text-xs text-red-600">
                {errors.barangay}
            </p>
          )}
        </div>
        <Select
          value={selectedBarangay}
          onValueChange={setSelectedBarangay}
          disabled={!selectedCity}
          name="barangay"
        >
          <SelectTrigger id="barangay" className="w-full">
            <SelectValue placeholder="Select barangay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              ...
            </SelectItem>
            {barangays.map((barangay, index) => (
              <SelectItem key={getUniqueKey(barangay, index)} value={barangay.name}>
                {barangay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}