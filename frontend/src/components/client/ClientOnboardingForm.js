import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useAuthStore from '../../../store/auth';

const ClientOnboardingForm = ({ 
  initialData = null, 
  onComplete, 
  onCancel, 
  isEditing = false 
}) => {
  const { token, user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [staffUsers, setStaffUsers] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(null);
  const [fetchingLocations, setFetchingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locationInputRefs = useRef([]);
  
  const [formData, setFormData] = useState(initialData || {
    name: '',
    industry: '',
    website: '',
    locations: [{ city: '', state: '', country: 'US', zip: '', radius: 25, radiusUnit: 'miles' }],
    services: [''],
    competitors: [''],
    primaryKeywords: [{ keyword: '', priority: 1, targetLocation: '', notes: '' }],
    secondaryKeywords: [{ keyword: '', targetLocation: '', notes: '' }],
    seedKeywords: [{ keyword: '', searchVolume: '', difficulty: '', intent: 'informational', source: 'manual' }],
    integrations: {
      googleSearchConsole: false,
      googleAnalytics: false,
      googleBusinessProfile: false,
    },
    assignedStaff: [],
  });

  // Total steps: 8 for Boss/Manager (includes staff assignment + review), 7 for Staff
  const totalSteps = (user?.role === 'Boss' || user?.role === 'Manager') ? 8 : 7;

  // Debug logging
  useEffect(() => {
    console.log('ClientOnboardingForm - User role:', user?.role, 'Total steps:', totalSteps);
  }, [user, totalSteps]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeLocationIndex !== null && locationInputRefs.current[activeLocationIndex]) {
        if (!locationInputRefs.current[activeLocationIndex].contains(event.target)) {
          setShowLocationDropdown(false);
          setActiveLocationIndex(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeLocationIndex]);

  // Fetch staff users
  useEffect(() => {
    const fetchStaffUsers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.status === 'success') {
          // Filter only staff users
          const staff = data.data.users.filter(u => u.role === 'Staff');
          setStaffUsers(staff);
        }
      } catch (error) {
        console.error('Failed to fetch staff users:', error);
      }
    };

    if (token && (user?.role === 'Boss' || user?.role === 'Manager')) {
      fetchStaffUsers();
    }
  }, [token, user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (arrayField, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [arrayField]: prev[arrayField].map((item, i) => {
        if (i === index) {
          // For simple string arrays (like services, competitors)
          if (field === null || field === undefined) {
            return value;
          }
          // For object arrays (like locations, keywords)
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const addArrayItem = (arrayField, template) => {
    setFormData(prev => ({
      ...prev,
      [arrayField]: [...prev[arrayField], template]
    }));
  };

  const removeArrayItem = (arrayField, index) => {
    setFormData(prev => ({
      ...prev,
      [arrayField]: prev[arrayField].filter((_, i) => i !== index)
    }));
  };

  // Handle city input change with autocomplete
  const handleCityInputChange = async (index, cityValue) => {
    // Update city field immediately
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map((item, i) => 
        i === index ? { ...item, city: cityValue } : item
      )
    }));

    setActiveLocationIndex(index);

    // If city is at least 2 characters, fetch suggestions
    if (cityValue.trim().length >= 2) {
      setFetchingLocations(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cityValue)}&format=json&addressdetails=1&limit=10`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'SEO-Ops-ClientOnboarding/1.0'
            }
          }
        );
        
        const data = await response.json();
        
        // Format location suggestions with proper hierarchy
        const formatted = data.map(item => {
          const parts = [];
          
          if (item.address.city) parts.push(item.address.city);
          else if (item.address.town) parts.push(item.address.town);
          else if (item.address.village) parts.push(item.address.village);
          else if (item.address.municipality) parts.push(item.address.municipality);
          
          if (item.address.state) parts.push(item.address.state);
          if (item.address.country) parts.push(item.address.country);
          
          return {
            display: parts.length > 0 ? parts.join(', ') : item.display_name,
            full: item.display_name,
            city: item.address.city || item.address.town || item.address.village || item.address.municipality || '',
            state: item.address.state || '',
            country: item.address.country_code ? item.address.country_code.toUpperCase() : '',
            zip: item.address.postcode || ''
          };
        });
        
        // Remove duplicates
        const unique = formatted.filter((item, index, self) => 
          index === self.findIndex(t => t.display === item.display)
        );
        
        setLocationSuggestions(unique);
        setShowLocationDropdown(unique.length > 0);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocationSuggestions([]);
      } finally {
        setFetchingLocations(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  };

  // Select a location from dropdown
  const selectLocation = (index, locationObj) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map((item, i) => 
        i === index 
          ? { 
              ...item, 
              city: locationObj.city,
              state: locationObj.state,
              country: locationObj.country,
              zip: locationObj.zip || item.zip
            } 
          : item
      )
    }));
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    setActiveLocationIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted. Current step:', currentStep, 'Total steps:', totalSteps);
    
    // Only allow submission on the final step
    if (currentStep !== totalSteps) {
      console.log('Not on final step, preventing submission');
      return;
    }
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Already submitting, ignoring...');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Clean up data before submitting
      const cleanedData = {
        ...formData,
        services: formData.services.filter(s => s.trim() !== ''),
        competitors: formData.competitors.filter(c => c.trim() !== ''),
        primaryKeywords: formData.primaryKeywords.filter(k => k.keyword.trim() !== ''),
        secondaryKeywords: formData.secondaryKeywords.filter(k => k.keyword.trim() !== ''),
        seedKeywords: formData.seedKeywords.filter(k => k.keyword.trim() !== ''),
        locations: formData.locations.filter(l => l.city.trim() !== '' || l.state.trim() !== '')
      };

      console.log('Calling onComplete with cleaned data:', cleanedData);
      await onComplete(cleanedData);
      console.log('onComplete finished successfully');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert(`Failed to submit: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    console.log('Next step clicked. Current:', currentStep, 'Total:', totalSteps);
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Prevent form submission when pressing Enter on non-final steps
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && currentStep !== totalSteps) {
      e.preventDefault();
      // Move to next step instead
      if (currentStep < totalSteps) {
        nextStep();
      }
    }
  };

  const renderStepContent = () => {
    // Add debugging
    console.log('Rendering step content. Step:', currentStep, 'User role:', user?.role, 'Total steps:', totalSteps);

    // Helper function to determine if current step should show review
    const isReviewStep = () => {
      if (user?.role === 'Boss' || user?.role === 'Manager') {
        return currentStep === 8;
      } else {
        return currentStep === 7;
      }
    };

    // Helper function to determine if current step should show staff assignment
    const isStaffAssignmentStep = () => {
      return (user?.role === 'Boss' || user?.role === 'Manager') && currentStep === 7;
    };

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
              <p className="text-gray-600">Let's start with the basics about your client</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter client business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com (optional)"
              />
              <p className="text-sm text-gray-500 mt-1">
                If not provided, we'll generate a unique identifier from the client name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an industry</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Legal">Legal</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Travel & Tourism">Travel & Tourism</option>
                <option value="Food & Restaurant">Food & Restaurant</option>
                <option value="Automotive">Automotive</option>
                <option value="Fashion & Beauty">Fashion & Beauty</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Locations</h2>
              <p className="text-gray-600">Add all locations where your client operates</p>
            </div>

            {formData.locations.map((location, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg border relative">
                {formData.locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('locations', index)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative" ref={el => locationInputRefs.current[index] = el}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={location.city}
                      onChange={(e) => handleCityInputChange(index, e.target.value)}
                      onFocus={() => location.city && locationSuggestions.length > 0 && setShowLocationDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Type city name"
                    />
                    <p className="text-xs text-gray-500 mt-1">Type to search and auto-fill all fields</p>
                    
                    {/* Loading indicator */}
                    {fetchingLocations && activeLocationIndex === index && (
                      <div className="absolute right-3 top-9">
                        <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    
                    {/* Location Suggestions Dropdown */}
                    {showLocationDropdown && activeLocationIndex === index && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map((locObj, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectLocation(index, locObj)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-b-0"
                          >
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{locObj.display}</div>
                                {locObj.full !== locObj.display && (
                                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{locObj.full}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={location.state}
                      onChange={(e) => handleArrayInputChange('locations', index, 'state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-filled from city"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={location.zip}
                      onChange={(e) => handleArrayInputChange('locations', index, 'zip', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-filled from city"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={location.country}
                      onChange={(e) => handleArrayInputChange('locations', index, 'country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-filled from city"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Radius
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={location.radius}
                        onChange={(e) => handleArrayInputChange('locations', index, 'radius', parseInt(e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="25"
                        min="1"
                      />
                      <select
                        value={location.radiusUnit}
                        onChange={(e) => handleArrayInputChange('locations', index, 'radiusUnit', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="miles">Miles</option>
                        <option value="km">KM</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addArrayItem('locations', { city: '', state: '', country: 'US', zip: '', radius: 25, radiusUnit: 'miles' })}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Another Location
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Services Offered</h2>
              <p className="text-gray-600">What services does your client provide?</p>
            </div>

            <div className="space-y-4">
              {formData.services.map((service, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => handleArrayInputChange('services', index, null, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Web Design, Digital Marketing, SEO Services"
                  />
                  {formData.services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('services', index)}
                      className="px-3 py-3 text-red-500 hover:text-red-700"
                    >
                      <MinusIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addArrayItem('services', '')}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Another Service
            </button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Main Competitors</h2>
              <p className="text-gray-600">Who are your client's main competitors?</p>
            </div>

            <div className="space-y-4">
              {formData.competitors.map((competitor, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={competitor}
                    onChange={(e) => handleArrayInputChange('competitors', index, null, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., competitor.com or Company Name"
                  />
                  {formData.competitors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('competitors', index)}
                      className="px-3 py-3 text-red-500 hover:text-red-700"
                    >
                      <MinusIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addArrayItem('competitors', '')}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Another Competitor
            </button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Keywords Strategy</h2>
              <p className="text-gray-600">Set up the keyword foundation for SEO success</p>
            </div>

            {/* Primary Keywords */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Keywords (High Priority)</h3>
              <div className="space-y-4">
                {formData.primaryKeywords.map((keyword, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Keyword
                        </label>
                        <input
                          type="text"
                          value={keyword.keyword}
                          onChange={(e) => handleArrayInputChange('primaryKeywords', index, 'keyword', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., web design services"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority (1-5)
                        </label>
                        <select
                          value={keyword.priority}
                          onChange={(e) => handleArrayInputChange('primaryKeywords', index, 'priority', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={1}>1 - Highest</option>
                          <option value={2}>2 - High</option>
                          <option value={3}>3 - Medium</option>
                          <option value={4}>4 - Low</option>
                          <option value={5}>5 - Lowest</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Location
                        </label>
                        <input
                          type="text"
                          value={keyword.targetLocation}
                          onChange={(e) => handleArrayInputChange('primaryKeywords', index, 'targetLocation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., New York, NY"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={keyword.notes}
                        onChange={(e) => handleArrayInputChange('primaryKeywords', index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional notes about this keyword"
                      />
                    </div>
                    {formData.primaryKeywords.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('primaryKeywords', index)}
                        className="mt-2 text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('primaryKeywords', { keyword: '', priority: 1, targetLocation: '', notes: '' })}
                  className="w-full py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-500 hover:text-blue-700 flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Primary Keyword
                </button>
              </div>
            </div>

            {/* Secondary Keywords */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Secondary Keywords</h3>
              <div className="space-y-4">
                {formData.secondaryKeywords.map((keyword, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Keyword
                        </label>
                        <input
                          type="text"
                          value={keyword.keyword}
                          onChange={(e) => handleArrayInputChange('secondaryKeywords', index, 'keyword', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., affordable web design"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Location
                        </label>
                        <input
                          type="text"
                          value={keyword.targetLocation}
                          onChange={(e) => handleArrayInputChange('secondaryKeywords', index, 'targetLocation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., New York, NY"
                        />
                      </div>
                    </div>
                    {formData.secondaryKeywords.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('secondaryKeywords', index)}
                        className="mt-2 text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('secondaryKeywords', { keyword: '', targetLocation: '', notes: '' })}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Secondary Keyword
                </button>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h2>
              <p className="text-gray-600">Connect your client's Google services for better tracking</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">GSC</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Google Search Console</h4>
                    <p className="text-sm text-gray-600">Track search performance and indexing</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.integrations.googleSearchConsole}
                    onChange={(e) => handleInputChange('integrations', {
                      ...formData.integrations,
                      googleSearchConsole: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">GA4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Google Analytics</h4>
                    <p className="text-sm text-gray-600">Monitor website traffic and user behavior</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.integrations.googleAnalytics}
                    onChange={(e) => handleInputChange('integrations', {
                      ...formData.integrations,
                      googleAnalytics: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">GBP</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Google Business Profile</h4>
                    <p className="text-sm text-gray-600">Manage local business presence</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.integrations.googleBusinessProfile}
                    onChange={(e) => handleInputChange('integrations', {
                      ...formData.integrations,
                      googleBusinessProfile: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                  ℹ️
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Integration Setup</h4>
                  <p className="text-sm text-blue-800">
                    These integrations can be configured later in the client settings. 
                    You'll need proper access permissions from your client to connect these services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        // For Staff users, show Review step
        if (user?.role !== 'Boss' && user?.role !== 'Manager') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Confirm</h2>
                <p className="text-gray-600">Review your client information before submitting</p>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client Name:</span>
                      <span className="font-medium text-gray-900">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Website:</span>
                      <span className="font-medium text-gray-900">{formData.website}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Industry:</span>
                      <span className="font-medium text-gray-900">{formData.industry}</span>
                    </div>
                  </div>
                </div>

                {/* Locations */}
                {formData.locations && formData.locations.length > 0 && formData.locations.some(l => l.city) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Target Locations</h3>
                    <div className="space-y-2">
                      {formData.locations.filter(l => l.city).map((loc, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          {loc.city}{loc.state ? `, ${loc.state}` : ''}{loc.country ? `, ${loc.country}` : ''} 
                          {loc.radius ? ` (${loc.radius} ${loc.radiusUnit || 'miles'} radius)` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services */}
                {formData.services && formData.services.filter(s => s.trim()).length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Services</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.services.filter(s => s.trim()).map((service, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {formData.competitors && formData.competitors.filter(c => c.trim()).length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Competitors</h3>
                    <div className="space-y-1">
                      {formData.competitors.filter(c => c.trim()).map((competitor, idx) => (
                        <div key={idx} className="text-sm text-gray-700">{competitor}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {((formData.primaryKeywords && formData.primaryKeywords.filter(k => k.keyword.trim()).length > 0) ||
                  (formData.secondaryKeywords && formData.secondaryKeywords.filter(k => k.keyword.trim()).length > 0)) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Keywords</h3>
                    {formData.primaryKeywords && formData.primaryKeywords.filter(k => k.keyword.trim()).length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Keywords:</h4>
                        <div className="flex flex-wrap gap-2">
                          {formData.primaryKeywords.filter(k => k.keyword.trim()).map((kw, idx) => (
                            <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              {kw.keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {formData.secondaryKeywords && formData.secondaryKeywords.filter(k => k.keyword.trim()).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Secondary Keywords:</h4>
                        <div className="flex flex-wrap gap-2">
                          {formData.secondaryKeywords.filter(k => k.keyword.trim()).map((kw, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {kw.keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Integrations */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Integrations</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.integrations?.googleSearchConsole && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Google Search Console</span>
                    )}
                    {formData.integrations?.googleAnalytics && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Google Analytics</span>
                    )}
                    {formData.integrations?.googleBusinessProfile && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Google Business Profile</span>
                    )}
                    {!formData.integrations?.googleSearchConsole && 
                     !formData.integrations?.googleAnalytics && 
                     !formData.integrations?.googleBusinessProfile && (
                      <span className="text-sm text-gray-500 italic">No integrations selected</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">Ready to Submit</h4>
                    <p className="text-sm text-green-800">
                      Click "Complete Onboarding" to create this client profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        
        // For Boss/Manager users, show Assign Staff step
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Assign Staff</h2>
              <p className="text-gray-600">Select which staff members should have access to this client</p>
            </div>

            {staffUsers.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  No staff users available. Create staff users in the Team page first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffUsers.map((staff) => (
                  <div
                    key={staff._id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{staff.name}</h4>
                        <p className="text-sm text-gray-600">{staff.email}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignedStaff.includes(staff._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleInputChange('assignedStaff', [...formData.assignedStaff, staff._id]);
                          } else {
                            handleInputChange('assignedStaff', formData.assignedStaff.filter(id => id !== staff._id));
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                  ℹ️
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Staff Access</h4>
                  <p className="text-sm text-blue-800">
                    Assigned staff members will have access to this client's data, including audits, pages, keywords, and reports.
                    You can change these assignments later in the client settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        // Only show this step for Boss/Manager
        if (user?.role !== 'Boss' && user?.role !== 'Manager') {
          return null;
        }
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Confirm</h2>
              <p className="text-gray-600">Review your client information before submitting</p>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client Name:</span>
                    <span className="font-medium text-gray-900">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Website:</span>
                    <span className="font-medium text-gray-900">{formData.website}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Industry:</span>
                    <span className="font-medium text-gray-900">{formData.industry}</span>
                  </div>
                </div>
              </div>

              {/* Locations */}
              {formData.locations && formData.locations.length > 0 && formData.locations.some(l => l.city) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Locations</h3>
                  <div className="space-y-1 text-sm">
                    {formData.locations.filter(l => l.city).map((loc, idx) => (
                      <div key={idx} className="text-gray-700">
                        {loc.city}, {loc.state} {loc.zip}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {formData.services && formData.services.filter(s => s.trim()).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.services.filter(s => s.trim()).map((service, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Staff */}
              {formData.assignedStaff && formData.assignedStaff.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Assigned Staff</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.assignedStaff.map((staffId) => {
                      const staff = staffUsers.find(s => s._id === staffId);
                      return staff ? (
                        <span key={staffId} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {staff.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Integrations */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Integrations</h3>
                <div className="flex gap-2">
                  {formData.integrations?.googleSearchConsole && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Google Search Console</span>
                  )}
                  {formData.integrations?.googleAnalytics && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Google Analytics</span>
                  )}
                  {formData.integrations?.googleBusinessProfile && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Google Business Profile</span>
                  )}
                  {!formData.integrations?.googleSearchConsole && 
                   !formData.integrations?.googleAnalytics && 
                   !formData.integrations?.googleBusinessProfile && (
                    <span className="text-sm text-gray-500 italic">No integrations selected</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <h4 className="font-medium text-green-900 mb-1">Ready to Submit</h4>
                  <p className="text-sm text-green-800">
                    Click "Complete Onboarding" to create this client profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        console.warn('Unexpected step:', currentStep, 'User role:', user?.role);
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading step content...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Client' : 'Client Onboarding'}
            </h1>
            <span className="text-sm text-gray-600">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            {renderStepContent() || (
              <div className="text-center py-8">
                <p className="text-red-600">Error: No content for this step</p>
                <p className="text-sm text-gray-600 mt-2">
                  Step: {currentStep}, Role: {user?.role}, Total Steps: {totalSteps}
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isSubmitting ? 'Submitting...' : (isEditing ? 'Update Client' : 'Complete Onboarding')}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboardingForm;