import { useRoute } from './router';
import { getBody, getTool } from './data';
import PlanetCarousel from './components/PlanetCarousel';
import PlanetView from './components/PlanetView';
import ToolPage from './components/ToolPage';

export default function App() {
  const route = useRoute();
  if (route.name === 'body' && getBody(route.id)) return <PlanetView key={route.id} bodyId={route.id} />;
  if (route.name === 'tool' && getTool(route.id)) return <ToolPage key={route.id} toolId={route.id} />;
  return <PlanetCarousel key="home" />;
}
