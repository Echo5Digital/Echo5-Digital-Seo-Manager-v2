import React from 'react';
import Layout from '../../components/Layout'; // Use existing Layout component

const MainLayout = ({ children }) => {
  return <Layout>{children}</Layout>;
};

export default MainLayout;