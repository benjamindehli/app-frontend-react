/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useState } from 'react';
import type { ReactNode } from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Close } from '@navikt/ds-icons';

import { DevNavigationButtons } from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons';
import { PDFPreviewButton } from 'src/features/devtools/components/PDFPreviewButton/PDFPreviewButton';
import classes from 'src/features/devtools/DevTools.module.css';

function clampHeight(height: number): number {
  return Math.min(Math.max(height, 10), window.innerHeight);
}

interface IDevToolsPanelProps {
  isOpen: boolean;
  close: () => void;
  children: ReactNode;
}

export const DevToolsPanel = ({ isOpen, close, children }: IDevToolsPanelProps) => {
  const [height, setHeight] = useState(250);

  const resizeHandler = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const startHeight = clampHeight(height);
    const startPosition = mouseDownEvent.screenY;

    function onMouseMove(mouseMoveEvent: MouseEvent) {
      if (mouseMoveEvent.buttons < 1) {
        onMouseUp();
        return;
      }
      setHeight(() => clampHeight(startHeight + startPosition - mouseMoveEvent.screenY));
    }
    function onMouseUp() {
      document.body.removeEventListener('mousemove', onMouseMove);
    }

    document.body.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('mouseup', onMouseUp, { once: true });
  };

  const resizeHandlerMobile = (touchStartEvent: React.TouchEvent) => {
    touchStartEvent.preventDefault();
    const startHeight = clampHeight(height);
    const startPosition = touchStartEvent.touches[0].screenY;

    function onTouchMove(touchMoveEvent: TouchEvent) {
      setHeight(() => clampHeight(startHeight + startPosition - touchMoveEvent.touches[0].screenY));
    }
    function onTouchEnd() {
      document.body.removeEventListener('touchmove', onTouchMove);
    }

    document.body.addEventListener('touchmove', onTouchMove);
    document.body.addEventListener('touchend', onTouchEnd, { once: true });
  };

  return (
    <>
      <div
        className={classes.appContainer}
        style={{ paddingBottom: isOpen ? height : 0 }}
      >
        {children}
      </div>
      {isOpen && (
        <div
          className={classes.panel}
          style={{ height }}
        >
          <div
            role='separator'
            className={classes.handle}
            onMouseDown={resizeHandler}
            onTouchStart={resizeHandlerMobile}
          />
          <div className={classes.panelContent}>
            <div className={classes.header}>
              <h2>Utviklerverktøy</h2>
              <Button
                onClick={close}
                variant={ButtonVariant.Quiet}
                color={ButtonColor.Secondary}
                aria-label={'close'}
                icon={<Close aria-hidden />}
              />
            </div>
            <div className={classes.controlsWrapper}>
              <PDFPreviewButton />
              <DevNavigationButtons />
            </div>
          </div>
        </div>
      )}
    </>
  );
};