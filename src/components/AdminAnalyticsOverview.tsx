import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import adminDashboardStyles from '../pages/AdminDashboard.module.css';

const ADMIN_ANALYTICS_TRAINEES_BY_DEPT = [
  { name: 'Cardiothoracic', value: 10, color: '#ffffff' },
  { name: 'ENT', value: 6, color: '#0E98df' },
  { name: 'Urology', value: 2, color: '#2e3c4b' },
];

const ADMIN_ANALYTICS_MODULE_COMPLETION_BY_DEPT = [
  { name: 'Cardiothoracic', value: 5, color: '#ffffff' },
  { name: 'ENT', value: 6, color: '#0E98df' },
  { name: 'Urology', value: 12, color: '#2e3c4b' },
];

const ADMIN_ANALYTICS_AVERAGE_USAGE_PER_DAY = [
  { day: 'Sunday', users: 22 },
  { day: 'Monday', users: 2 },
  { day: 'Tuesday', users: 2 },
  { day: 'Wednesday', users: 8 },
  { day: 'Thursday', users: 12 },
  { day: 'Friday', users: 16 },
  { day: 'Saturday', users: 20 },
];

const AdminAnalyticsOverview: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const traineesByDeptData = ADMIN_ANALYTICS_TRAINEES_BY_DEPT;
  const moduleCompletionData = ADMIN_ANALYTICS_MODULE_COMPLETION_BY_DEPT;
  const averageUsageData = ADMIN_ANALYTICS_AVERAGE_USAGE_PER_DAY;

  return (
    <>
      {/* Totals Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', position: 'relative' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>Totals</h3>
          <div
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="7" stroke="#ffffff" strokeWidth="1" fill="none"/>
              <text x="8" y="11" textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="bold">i</text>
            </svg>
            {showTooltip && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
                backgroundColor: '#1E2733',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
                minWidth: '280px',
                whiteSpace: 'nowrap'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <path d="M6 2L10 8H2L6 2Z" fill="#73BC42"/>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#ffffff' }}>Increase compared to previous 30 days</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#d9d9d9', flexShrink: 0 }}></div>
                    <span style={{ fontSize: '14px', color: '#ffffff' }}>No change compared to previous 30 days</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <path d="M6 10L2 4H10L6 10Z" fill="#c80000"/>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#ffffff' }}>Decrease compared to previous 30 days</span>
                  </div>
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid #1E2733'
                }}></div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
          <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
              <span style={{ fontSize: '44px', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>64</span>
              <svg width="18" height="18" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M6 2L10 8H2L6 2Z" fill="#73BC42"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>Total Usage Hours</div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Last 30 Days</div>
            </div>
          </div>

          <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
              <span style={{ fontSize: '44px', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>4</span>
              <div style={{ width: '18px', height: '18px', backgroundColor: '#d9d9d9', flexShrink: 0 }} />
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>Total New Trainees</div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Last 30 Days</div>
            </div>
          </div>

          <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
              <span style={{ fontSize: '44px', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>18</span>
              <svg width="18" height="18" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M6 10L2 4H10L6 10Z" fill="#c80000"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>Total Active Trainees</div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Last 30 Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* By Department Section */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>By Department</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
            <h4 className={adminDashboardStyles.chartCardTitle}>Number of Trainees by Department</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={traineesByDeptData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    tickMargin={10}
                    label={{
                      value: 'Department',
                      position: 'bottom',
                      offset: 16,
                      style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 },
                    }}
                    stroke="#ffffff"
                    tick={{ fill: '#ffffff', fontSize: 12 }}
                  />
                  <YAxis
                    label={{ value: 'Number of Trainees', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }}
                    stroke="#ffffff"
                    tick={{ fill: '#ffffff', fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {traineesByDeptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              {traineesByDeptData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                  <span style={{ fontSize: '12px', color: '#ffffff' }}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
            <h4 className={adminDashboardStyles.chartCardTitle}>Module Completion by Department</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleCompletionData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    tickMargin={10}
                    label={{
                      value: 'Highest Module Completed',
                      position: 'bottom',
                      offset: 16,
                      style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 },
                    }}
                    stroke="#ffffff"
                    tick={{ fill: '#ffffff', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    label={{ value: 'Department', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }}
                    stroke="#ffffff"
                    tick={{ fill: '#ffffff', fontSize: 12 }}
                    width={100}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {moduleCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              {moduleCompletionData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                  <span style={{ fontSize: '12px', color: '#ffffff' }}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Average Usage per Day Section */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>Average Usage per Day</h3>
        <div style={{ borderRadius: '8px', padding: '24px', backgroundColor: '#1E2733', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={averageUsageData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="day"
                  tickMargin={10}
                  label={{
                    value: 'Days of the Week',
                    position: 'bottom',
                    offset: 16,
                    style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 },
                  }}
                  stroke="#ffffff"
                  tick={{ fill: '#ffffff', fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Active Users', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ffffff', fontSize: 12 } }}
                  stroke="#ffffff"
                  tick={{ fill: '#ffffff', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="users" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminAnalyticsOverview;
