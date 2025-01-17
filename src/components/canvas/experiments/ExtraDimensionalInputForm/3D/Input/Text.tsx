import { Html, Mask, Text as TextImpl, useMask } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  Ref,
  Suspense,
  useMemo,
  useState,
  useRef,
  useCallback,
  ChangeEvent,
  FocusEvent,
  useEffect,
  forwardRef,
  RefObject,
} from "react";
import { BufferGeometry, Group, Material, Mesh } from "three";
import { damp } from "three/src/math/MathUtils";
import { TroikaTextProps } from ".";
import { getCaretAtPoint } from "troika-three-text";

export type TextProps = {
  onChange?: (e: ChangeEvent) => void;
  width: number;
  height: number;
  padding: [number, number];
  type: "text" | "password";
} & TroikaTextProps;

const Text = forwardRef(
  (props: TextProps, ref: RefObject<HTMLInputElement>) => {
    const {
      fontSize,
      font,
      color,
      padding,
      width,
      height,
      type,
      onChange,
      ...restProps
    } = props;
    const localRef = useRef<HTMLInputElement>();
    const domRef = ref || localRef;
    const textRef = useRef<Mesh<BufferGeometry, Material>>();
    const groupRef = useRef<Group>();
    const caretRef = useRef<Mesh<BufferGeometry, Material>>();
    const stencil = useMask(1);

    // STATE
    const clock = useThree((s) => s.clock);
    const time = useRef<number>(0);
    const [active, setActive] = useState<boolean>(false);
    const [content, setContent] = useState<string>("");
    const [caret, setCaret] = useState<number>(0);
    const [selection, setSelection] = useState<[number, number]>([0, 0]);
    const [renderInfo, setRenderInfo] = useState(null);

    const caretPositions: number[] = useMemo(() => {
      if (!renderInfo?.caretPositions) return [0];

      let lastCaret =
        renderInfo.caretPositions[renderInfo.caretPositions.length - 2];

      const caretPositions = [
        ...renderInfo.caretPositions.filter(
          (_: any, idx: number) => idx % 3 === 0
        ),
      ];

      caretPositions.push(lastCaret);
      return caretPositions;
    }, [renderInfo]);

    // EVENTS
    const handleSync = (text: any) => {
      if (text) setRenderInfo(text.textRenderInfo);
    };

    const handleFocus = (e: FocusEvent) => {
      e.nativeEvent.preventDefault();
      setActive(true);
    };

    const handleBlur = (e: FocusEvent) => {
      setSelection([0, 0]);
      setActive(false);
    };

    const handleSelect = useCallback(
      (e) => {
        const { selectionStart, selectionEnd } = e.target;

        if (selectionStart === selectionEnd) {
          setCaret(selectionStart);
        } else {
          setCaret(null);
        }

        setSelection([selectionStart, selectionEnd]);
        time.current = clock.elapsedTime;
      },
      [clock]
    );

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        setContent(e.target.value);
        onChange && onChange(e);
      },
      [onChange]
    );

    const handleClick = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        if (!active) {
          domRef.current.focus();
        }

        if (e.detail === 3) {
          domRef.current.select();
        }
      },
      [active, domRef]
    );

    const handleDoubleClick = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        function isWhitespace(str: string): boolean {
          return str && str.trim() === "";
        }

        let start: number = 0,
          end: number = content.length;

        if (type === "password") {
          domRef.current.select();
          return;
        }

        for (let i = caret; i < content.length; i++) {
          if (isWhitespace(content[i])) {
            end = i;
            break;
          }
        }

        for (let i = caret; i > 0; i--) {
          if (isWhitespace(content[i])) {
            start = i > 0 ? i + 1 : i;
            break;
          }
        }

        domRef.current.setSelectionRange(start, end, "none");
      },
      [caret, content, type, domRef]
    );

    const handlePointerDown = useCallback(
      (e: ThreeEvent<PointerEvent>) => {
        time.current = clock.elapsedTime;

        if (!renderInfo || !content) {
          return;
        }

        let point = textRef.current.worldToLocal(e.point);
        let idx = getCaretAtPoint(renderInfo, point.x, point.y).charIndex;
        setSelection([idx, idx]);
        setCaret(idx);
        domRef.current.setSelectionRange(idx, idx, "none");
      },
      [domRef, renderInfo, clock, content]
    );

    const handlePointerMove = useCallback(
      (e: ThreeEvent<PointerEvent>) => {
        let buttons = e.buttons;

        // left click not held (i.e. not dragging)
        let dragging = buttons === 1 || buttons === 3;
        if (!dragging || !renderInfo || !content) return;

        let point = textRef.current.worldToLocal(e.point);
        let idx = getCaretAtPoint(renderInfo, point.x, point.y).charIndex;
        let start: number, end: number, dir: "forward" | "backward" | "none";

        if (idx < caret) {
          start = idx;
          end = caret;
          dir = "backward";
        } else if (idx > caret) {
          start = caret;
          end = idx;
          dir = "forward";
        } else {
          start = end = idx;
          dir = "none";
        }

        setSelection([start, end]);
        domRef.current.setSelectionRange(start, end, dir);
      },
      [domRef, renderInfo, caret, content]
    );

    // EFFECTS
    useEffect(() => {
      let pos: number;
      let _width = width - padding[0] * width * 2;
      let [selectionStart, selectionEnd] = [
        caretPositions[selection[0]] + groupRef.current.position.x,
        caretPositions[selection[1]] + groupRef.current.position.x,
      ];

      let left = 0;
      let right = _width;

      if (caret !== null) {
        pos = caretPositions[caret] + groupRef.current.position.x;
        if (caret > 0) {
          // ensure there is always a character visible on the left
          left += caretPositions[caret] - caretPositions[caret - 1];
        }
        if (pos === undefined || Number.isNaN(pos)) return;
      } else {
        let dir = domRef.current.selectionDirection;
        if (selectionStart < left && dir === "backward") {
          pos = selectionStart;
        } else if (selectionEnd > right && dir === "forward") {
          pos = selectionEnd;
        }
      }

      if (pos > right) {
        let dx = pos - right;
        groupRef.current.position.x -= dx;
      } else if (pos < left) {
        let dx = left - pos;
        groupRef.current.position.x += dx;
      }
    }, [width, padding, caret, caretPositions, selection, domRef]);

    useFrame((_, delta) => {
      if (!caretRef.current) return;

      let t = (clock.elapsedTime - time.current) % 2;
      let opacity = t <= 1.25 ? 1 : 0;

      caretRef.current.material.opacity = damp(
        caretRef.current.material.opacity,
        opacity,
        24,
        delta
      );
    });

    return (
      <group>
        <Mask
          id={1}
          position-z={0.01}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          <planeGeometry args={[width, height]} />
        </Mask>

        <Html distanceFactor={3}>
          <input
            ref={domRef}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            onSelect={handleSelect}
            style={{
              position: "absolute",
              left: "-1000vw",
              transform: "translateX(-50%)",
              width: `${10 * width}em`,
              touchAction: "none",
              pointerEvents: "none",
              opacity: 0,
            }}
          />
        </Html>

        <group position={[-width / 2 + padding[0] * width, 0, 0]}>
          <group ref={groupRef}>
            <Suspense fallback={null}>
              <TextImpl
                ref={textRef}
                onSync={handleSync}
                fontSize={fontSize}
                font={font}
                anchorX="left"
                anchorY="top-baseline"
                // @ts-ignore
                whiteSpace="nowrap"
                letterSpacing={type === "password" ? 0.1 : 0}
                depthOffset={0.2}
                position-y={-renderInfo?.capHeight / 2}
                {...restProps}
              >
                {type === "password" ? "•".repeat(content.length) : content}
                <meshBasicMaterial
                  color={color}
                  {...stencil}
                  depthWrite={false}
                />
              </TextImpl>
            </Suspense>

            <mesh
              ref={caretRef}
              position={[content ? caretPositions[caret || 0] : 0, 0, 0]}
              visible={active && caret !== null}
            >
              <planeGeometry args={[0.005, fontSize]} />
              <meshBasicMaterial color={color} transparent depthWrite={false} />
            </mesh>

            <group
              position={[
                (caretPositions[selection[0]] + caretPositions[selection[1]]) /
                  2,
                0,
                0,
              ]}
            >
              <mesh
                scale-x={Math.abs(
                  caretPositions[selection[0]] - caretPositions[selection[1]]
                )}
              >
                <planeGeometry args={[1, fontSize]} />
                <meshBasicMaterial
                  color="blue"
                  transparent
                  opacity={0.25}
                  depthWrite={false}
                  {...stencil}
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    );
  }
);

Text.displayName = "Text";

export default Text;
