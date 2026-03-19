import { WidgetRegistryEntry } from './types';

const widgetRegistry = new Map<string, WidgetRegistryEntry>();

export function registerWidget(entry: WidgetRegistryEntry): void {
  widgetRegistry.set(entry.name, entry);
}

export function getWidget(name: string): WidgetRegistryEntry | undefined {
  return widgetRegistry.get(name);
}

export function getAllWidgets(): WidgetRegistryEntry[] {
  return Array.from(widgetRegistry.values());
}

// Auto-register built-in widgets
import { networkVisualizationWidget } from './components/NetworkVisualization';
import { serverAnimationWidget } from './components/ServerAnimation';
import { neuralNetServerWidget } from './components/NeuralNetServer';
import { logoCarouselWidget } from './components/LogoCarousel';
import { logoOrbitWidget } from './components/LogoOrbit';
import { logoGridRevealWidget } from './components/LogoGridReveal';
import { logoMorphChainWidget } from './components/LogoMorphChain';
registerWidget(networkVisualizationWidget);
registerWidget(serverAnimationWidget);
registerWidget(neuralNetServerWidget);
registerWidget(logoCarouselWidget);
registerWidget(logoOrbitWidget);
registerWidget(logoGridRevealWidget);
registerWidget(logoMorphChainWidget);
