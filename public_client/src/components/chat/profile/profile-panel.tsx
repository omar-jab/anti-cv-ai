import { useState } from "react";
import Profile, { type UserProfileData } from "./profile";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import CV, { type CVSchema } from "./cv";

interface Props {
  user: UserProfileData;
  cvData: CVSchema | null;
}

export default function ProfilePanel({ user, cvData }: Props) {
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null);
  const [isCvOpen, setIsCvOpen] = useState(false);

  return (
    <div
      ref={setPanelElement}
      className="relative h-full w-full overflow-hidden"
    >
      <div className="h-full overflow-y-auto px-4 pb-6">
        <Profile user={user} />
        {cvData && (
          <div className="mx-auto mt-6 w-full max-w-[340px]">
            <Drawer open={isCvOpen} onOpenChange={setIsCvOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="w-full">
                  Vedi CV
                </Button>
              </DrawerTrigger>

              <DrawerContent
                container={panelElement}
                onInteractOutside={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
                overlayClassName="absolute inset-0"
                className="absolute inset-x-0 bottom-0 max-h-[80%] mt-0"
              >
                <DrawerHeader>
                  <DrawerTitle>Curriculum</DrawerTitle>
                  <DrawerDescription>
                    Curriculum professionale generato automaticamente.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <CV data={cvData} />
                </div>

                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline">Chiudi</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        )}
      </div>
    </div>
  );
}
