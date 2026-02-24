"use client";
import React from "react";
import axios from "axios";
import { Label } from "~/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { Input } from "~/components/ui/input";

// Helper function to ensure unique keys using code instead of index
const getUniqueKey = (item: any) => {
  return item.code || `${item.name}-${Math.random()}`;
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
  const [barangays, setBarangays] = React.useState<any[]>([]);
  const [selectedBarangay, setSelectedBarangay] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchBarangays = async () => {
      try {
        setIsLoading(true);
        
        // Try to find Zamboanga City in cities-municipalities endpoint
        const citiesMunicipalitiesRes = await axios.get("https://psgc.gitlab.io/api/cities-municipalities.json");
        
        // Look for Zamboanga City
        const zamboangaCity = citiesMunicipalitiesRes.data.find(
          (city: any) => city.name === "Zamboanga City" || city.name === "Zamboanga"
        );
        
        if (zamboangaCity) {
          // Fetch barangays using the city code
          const barangaysRes = await axios.get(
            `https://psgc.gitlab.io/api/cities-municipalities/${zamboangaCity.code}/barangays.json`
          );
          
          // Remove duplicates by name and sort alphabetically
          const uniqueBarangays = Array.from(
            new Map(barangaysRes.data.map((item: any) => [item.name, item])).values()
          );
          
          const sortedBarangays = uniqueBarangays.sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
          );
          setBarangays(sortedBarangays);
        } else {
          console.error("Zamboanga City not found in cities-municipalities");
          
          // Fallback: Try to find it in the cities endpoint
          const citiesRes = await axios.get("https://psgc.gitlab.io/api/cities.json");
          const zamboangaCityAlt = citiesRes.data.find(
            (city: any) => city.name.includes("Zamboanga")
          );
          
          if (zamboangaCityAlt) {
            const barangaysRes = await axios.get(
              `https://psgc.gitlab.io/api/cities/${zamboangaCityAlt.code}/barangays.json`
            );
            
            // Remove duplicates by name
            const uniqueBarangays = Array.from(
              new Map(barangaysRes.data.map((item: any) => [item.name, item])).values()
            );
            
            const sortedBarangays = uniqueBarangays.sort((a: any, b: any) =>
              a.name.localeCompare(b.name)
            );
            setBarangays(sortedBarangays);
          } else {
            console.error("Zamboanga City not found in any endpoint");
          }
        }
      } catch (err) {
        console.error("❌ Error fetching barangays:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarangays();
  }, []);

  return (
    <div className="grid grid-cols-1 my-2 gap-4 md:grid-cols-3">
      {/* Province - Default value */}
      <div className="grid gap-3">
        <div className="flex items-center">
          <Label htmlFor="province">Province</Label>
          {errors?.province && (
            <p className="px-1 text-xs text-red-600">
                {errors.province}
            </p>
          )}
        </div>
        <Input
          id="province"
          name="province"
          value="Zamboanga Del Sur"
          readOnly
          className="bg-gray-100 cursor-not-allowed"
        />
      </div>

      {/* City / Municipality - Default value */}
      <div className="grid gap-3">
        <div className="flex items-center">
          <Label htmlFor="city">City / Municipality</Label>
          {errors?.city && (
            <p className="px-1 text-xs text-red-600">
                {errors.city}
            </p>
          )}
        </div>
        <Input
          id="city"
          name="city"
          value="Zamboanga City"
          readOnly
          className="bg-gray-100 cursor-not-allowed"
        />
      </div>

      {/* Barangay - Dropdown */}
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
          name="barangay"
        >
          <SelectTrigger id="barangay" className="w-full">
            <SelectValue placeholder={isLoading ? "Loading barangays..." : "Select barangay"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              ...
            </SelectItem>
            {barangays.length > 0 ? (
              barangays.map((barangay) => (
                <SelectItem key={getUniqueKey(barangay)} value={barangay.name}>
                  {barangay.name}
                </SelectItem>
              ))
            ) : (
              !isLoading && <SelectItem value="no-data" disabled>No barangays found</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}