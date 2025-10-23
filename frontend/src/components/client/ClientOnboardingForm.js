import React, { useState } from 'react';
import { PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ClientOnboardingForm = ({ 
  initialData = null, 
  onComplete, 
  onCancel, 
  isEditing = false 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
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
  });

  const totalSteps = 6;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
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

    onComplete(cleanedData);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
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
                Website URL *
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={location.city}
                      onChange={(e) => handleArrayInputChange('locations', index, 'city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="City name"
                    />
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
                      placeholder="State/Province"
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
                      placeholder="ZIP/Postal code"
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

      default:
        return null;
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
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

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
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {isEditing ? 'Update Client' : 'Complete Onboarding'}
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