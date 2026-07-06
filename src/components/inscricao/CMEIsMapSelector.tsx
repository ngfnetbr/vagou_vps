import { useState, useEffect, useCallback, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapPin, Navigation, ChevronDown, ChevronUp, Building, Check, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcularDistanciaKm, type CMEIComZonas, type ZonaAtendimento } from "@/hooks/api/zonas-hooks";
import { cn } from "@/utils/utils";
import { toast } from "sonner";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface CMEIsMapSelectorProps {
  cmeis: CMEIComZonas[];
  selectedCmei1: string | null;
  selectedCmei2: string | null;
  onSelectCmei1: (id: string) => void;
  onSelectCmei2: (id: string) => void;
  zonasDetectadas?: ZonaAtendimento[];
  highlightTrigger?: boolean;
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface CMEIComDistancia extends CMEIComZonas {
  distancia?: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "300px",
};

const defaultCenter = {
  lat: -23.5505,
  lng: -46.6333,
};

export const CMEIsMapSelector = ({
  cmeis,
  selectedCmei1,
  selectedCmei2,
  onSelectCmei1,
  onSelectCmei2,
  zonasDetectadas = [],
  highlightTrigger = false,
}: CMEIsMapSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: config } = useConfiguracoesPublicas();
  const { singular } = getUnidadeLabels(config as any);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<CMEIComDistancia | null>(null);

  // Fetch API key
  useEffect(() => {
    const fetchApiKey = async () => {
      setLoadingKey(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-maps-key");
        if (error) throw error;
        if (data?.key) {
          setApiKey(data.key);
        } else {
          setLoadError(true);
        }
      } catch (error) {
        console.error("Erro ao buscar API key do mapa:", error);
        setLoadError(true);
      } finally {
        setLoadingKey(false);
      }
    };

    if (isOpen && !apiKey && !loadError) {
      fetchApiKey();
    }
  }, [isOpen, apiKey, loadError]);

  // Calcular distâncias e ordenar CMEIs
  const cmeisComDistancia: CMEIComDistancia[] = useMemo(() => {
    if (!userLocation) return cmeis;

    return cmeis
      .map((cmei) => {
        if (cmei.latitude && cmei.longitude && cmei.latitude !== 0 && cmei.longitude !== 0) {
          const distancia = calcularDistanciaKm(
            userLocation.lat,
            userLocation.lng,
            cmei.latitude,
            cmei.longitude
          );
          return { ...cmei, distancia };
        }
        return { ...cmei, distancia: undefined };
      })
      .sort((a, b) => {
        if (a.distancia === undefined && b.distancia === undefined) return 0;
        if (a.distancia === undefined) return 1;
        if (b.distancia === undefined) return -1;
        return a.distancia - b.distancia;
      });
  }, [cmeis, userLocation]);

  // CMEIs com coordenadas válidas para o mapa
  const cmeisNoMapa = useMemo(() => {
    return cmeisComDistancia.filter(
      (cmei) => cmei.latitude && cmei.longitude && cmei.latitude !== 0 && cmei.longitude !== 0
    );
  }, [cmeisComDistancia]);

  // IDs das zonas detectadas
  const zonasIds = useMemo(() => new Set(zonasDetectadas.map((z) => z.id)), [zonasDetectadas]);

  const cmeiEstaNaZona = useCallback((cmei: CMEIComZonas) => {
    return cmei.zonas?.some((z) => zonasIds.has(z.zona_id)) || false;
  }, [zonasIds]);

  // Obter localização do usuário
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
        
        if (map) {
          map.panTo(newLocation);
          map.setZoom(14);
        }
        
        toast.success("Localização obtida com sucesso!");
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        toast.error("Não foi possível obter sua localização");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [map]);

  // Ajustar mapa para mostrar todos os marcadores
  const handleFitBounds = useCallback(() => {
    if (!map || cmeisNoMapa.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    
    if (userLocation) {
      bounds.extend(userLocation);
    }

    cmeisNoMapa.forEach((cmei) => {
      if (cmei.latitude && cmei.longitude) {
        bounds.extend({ lat: cmei.latitude, lng: cmei.longitude });
      }
    });

    map.fitBounds(bounds);
  }, [map, cmeisNoMapa, userLocation]);

  // Centro do mapa
  const center = useMemo(() => {
    if (userLocation) return userLocation;
    if (cmeisNoMapa.length > 0 && cmeisNoMapa[0].latitude && cmeisNoMapa[0].longitude) {
      return { lat: cmeisNoMapa[0].latitude, lng: cmeisNoMapa[0].longitude };
    }
    return defaultCenter;
  }, [userLocation, cmeisNoMapa]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleSelectCmei = useCallback((cmeiId: string, option: 1 | 2) => {
    if (option === 1) {
      onSelectCmei1(cmeiId);
      if (selectedCmei2 === cmeiId) {
        onSelectCmei2("");
      }
    } else {
      onSelectCmei2(cmeiId);
    }
    setSelectedMarker(null);
    toast.success(`${singular} selecionado como ${option}ª opção`);
  }, [onSelectCmei1, onSelectCmei2, selectedCmei2]);

  const formatDistancia = useCallback((km?: number) => {
    if (km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center justify-between p-4 h-auto",
              highlightTrigger &&
                "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/40 dark:border-blue-900/40"
            )}
            type="button"
          >
            <div className="flex items-center gap-2">
              <MapPin className={cn("h-4 w-4", highlightTrigger ? "text-blue-600 dark:text-blue-300" : "text-primary")} />
              <span className="font-medium">Localizar CMEIs no Mapa</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Botões de ação */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetLocation}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <Spinner className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Usar minha localização
              </Button>
              {userLocation && cmeisNoMapa.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={handleFitBounds}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver todos
                </Button>
              )}
            </div>

            {/* Mapa */}
            {loadingKey ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Carregando mapa...</span>
              </div>
            ) : loadError || !apiKey ? (
              <div className="text-center py-4 text-muted-foreground">
                Não foi possível carregar o mapa
              </div>
            ) : (
              <LoadScript googleMapsApiKey={apiKey}>
                <div className="rounded-lg overflow-hidden border">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={center}
                    zoom={userLocation ? 14 : 12}
                    onLoad={onMapLoad}
                    onUnmount={onMapUnmount}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {/* Marcador do usuário */}
                    {userLocation && (
                      <Marker
                        position={userLocation}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: "#3b82f6",
                          fillOpacity: 1,
                          strokeColor: "#ffffff",
                          strokeWeight: 3,
                        }}
                        title="Sua localização"
                      />
                    )}

                    {/* Marcadores dos CMEIs */}
                    {cmeisNoMapa.map((cmei) => {
                      const isSelected1 = selectedCmei1 === cmei.id;
                      const isSelected2 = selectedCmei2 === cmei.id;
                      const naZona = cmeiEstaNaZona(cmei);

                      return (
                        <Marker
                          key={cmei.id}
                          position={{ lat: cmei.latitude!, lng: cmei.longitude! }}
                          onClick={() => setSelectedMarker(cmei)}
                          icon={{
                            url: isSelected1 || isSelected2
                              ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                              : naZona
                              ? "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                              : "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                          }}
                          title={cmei.nome}
                        />
                      );
                    })}

                    {/* InfoWindow */}
                    {selectedMarker && selectedMarker.latitude && selectedMarker.longitude && (
                      <InfoWindow
                        position={{ lat: selectedMarker.latitude, lng: selectedMarker.longitude }}
                        onCloseClick={() => setSelectedMarker(null)}
                      >
                        <div className="p-2 min-w-[200px] max-w-[280px]">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{selectedMarker.nome}</h4>
                            <Badge
                              variant={(selectedMarker as any).tipo_gestao === "privado" ? "warning" : "info"}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {(selectedMarker as any).tipo_gestao === "privado" ? "Privado" : "Municipal"}
                            </Badge>
                          </div>
                          {selectedMarker.endereco && (
                            <p className="text-xs text-gray-600 mb-2">{selectedMarker.endereco}</p>
                          )}
                          {userLocation && selectedMarker.distancia !== undefined && (
                            <p className="text-xs text-blue-600 mb-2">
                              📏 {formatDistancia(selectedMarker.distancia)}
                            </p>
                          )}
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedCmei1 === selectedMarker.id ? "default" : "outline"}
                              className="text-xs h-7"
                              onClick={() => handleSelectCmei(selectedMarker.id, 1)}
                            >
                              {selectedCmei1 === selectedMarker.id && <Check className="h-3 w-3 mr-1" />}
                              1ª Opção
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedCmei2 === selectedMarker.id ? "default" : "outline"}
                              className="text-xs h-7"
                              onClick={() => handleSelectCmei(selectedMarker.id, 2)}
                              disabled={!selectedCmei1 || selectedCmei1 === selectedMarker.id}
                            >
                              {selectedCmei2 === selectedMarker.id && <Check className="h-3 w-3 mr-1" />}
                              2ª Opção
                            </Button>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </div>
              </LoadScript>
            )}

            {/* Lista de CMEIs mais próximos */}
            {userLocation && cmeisComDistancia.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  CMEIs mais próximos
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {cmeisComDistancia.slice(0, 10).map((cmei) => {
                    const isSelected1 = selectedCmei1 === cmei.id;
                    const isSelected2 = selectedCmei2 === cmei.id;
                    const naZona = cmeiEstaNaZona(cmei);

                    return (
                      <div
                        key={cmei.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border transition-colors",
                          (isSelected1 || isSelected2) && "bg-primary/5 border-primary/30",
                          !isSelected1 && !isSelected2 && "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{cmei.nome}</span>
                            <Badge
                              variant={(cmei as any).tipo_gestao === "privado" ? "warning" : "info"}
                              className="text-[10px] px-1 py-0 h-4 shrink-0"
                            >
                              {(cmei as any).tipo_gestao === "privado" ? "Privado" : "Municipal"}
                            </Badge>
                            {naZona && (
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] px-1 py-0 h-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0"
                              >
                                Sua região
                              </Badge>
                            )}
                          </div>
                          {cmei.distancia !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistancia(cmei.distancia)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelected1 ? "default" : "outline"}
                            className="text-[10px] h-6 px-2"
                            onClick={() => handleSelectCmei(cmei.id, 1)}
                          >
                            {isSelected1 && <Check className="h-3 w-3 mr-0.5" />}
                            1ª
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelected2 ? "default" : "outline"}
                            className="text-[10px] h-6 px-2"
                            onClick={() => handleSelectCmei(cmei.id, 2)}
                            disabled={!selectedCmei1 || selectedCmei1 === cmei.id}
                          >
                            {isSelected2 && <Check className="h-3 w-3 mr-0.5" />}
                            2ª
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dica */}
            <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>Clique em um marcador no mapa ou na lista para selecionar um CMEI</span>
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

