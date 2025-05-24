import React, { useEffect, useState } from 'react'
import AppointmentsContent from './AppointmentsContent';
import AddAppointment from './AddAppointment';
import TimingSchedular from './TimingSchedular';
import { useTheme } from '../../../context/ThemeContext';

function Appointments() {
    const { currentTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('viewappointment');

    

    const tabs = [
        { 
            id: 'viewappointment', 
            label: 'View Appointments', 
            component: AppointmentsContent,
        },
        { 
            id: 'addappointment', 
            label: 'Add Appointment', 
            component: AddAppointment,
        },
        { 
            id: 'timingschedular', 
            label: 'Scheduler', 
            component: TimingSchedular,
        }
    ];

    return (
        <div className='p-6 min-h-screen' style={{ backgroundColor: currentTheme.background }}>
            <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Appointments Management</h1>
      </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-6 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            // Reset registration data when switching tabs
                            
                        }}
                        className={`px-2 py-1 transition-all duration-200 relative ${
                            activeTab === tab.id ? 'font-semibold' : 'hover:opacity-80'
                        }`}
                        style={{
                            color: currentTheme.accent,
                            ...(activeTab === tab.id && {
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: '-2px',
                                    left: '0',
                                    width: '100%',
                                    height: '2px',
                                    backgroundColor: currentTheme.accent
                                }
                            })
                        }}
                    >
                        <span>{tab.label}</span>
                        {activeTab === tab.id && (
                            <div
                                className="absolute bottom-0 left-0 w-full h-0.5"
                                style={{ backgroundColor: currentTheme.accent }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ backgroundColor: currentTheme.surface }} className="rounded-lg shadow-md p-6">
                {tabs.map(tab => {
                    const TabComponent = tab.component;
                    return activeTab === tab.id && (
                        <TabComponent
                            key={tab.id}
                            theme={currentTheme}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default Appointments