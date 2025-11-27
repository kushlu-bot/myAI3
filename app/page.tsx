"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

// Storage helpers
const loadMessagesFromStorage = () => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };
    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch {
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored = typeof window !== "undefined" ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prev) => ({ ...prev, [key]: duration }));
  };

  // Welcome message
  useEffect(() => {
    if (isClient && initialMessages.length === 0 && !welcomeMessageShownRef.current) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  function onSubmit(data: any) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    setMessages([]);
    setDurations({});
    saveMessagesToStorage([], {});
    toast.success("Conversation Cleared");
  }

  return (
    <div className="flex h-screen items-center justify-center font-serif"
      style={{ backgroundColor: "#F7F3EB" }}
    >
      <main className="w-full h-screen relative">

        {/* HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 shadow-md"
          style={{ backgroundColor: "#4A342E", color: "white" }}
        >
          <ChatHeader>
            <ChatHeaderBlock />
            <ChatHeaderBlock className="justify-center items-center space-x-3">
              <Avatar className="size-8 ring-2" style={{ borderColor: "#D4AF37" }}>
                <AvatarImage src="/logo.png" />
                <AvatarFallback className="bg-white">
                  <Image src="/Our Logo.png" alt="Logo" width={36} height={36} />
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold tracking-tight text-lg">{AI_NAME}</p>
            </ChatHeaderBlock>

            <ChatHeaderBlock className="justify-end">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer border"
                style={{
                  backgroundColor: "#D4AF37",
                  color: "#4A342E",
                  borderColor: "#CBBBA0",
                }}
                onClick={clearChat}
              >
                <Plus className="size-4" />
                {CLEAR_CHAT_TEXT}
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* CHAT AREA */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[92px] pb-[150px]">
          <div className="flex flex-col items-center justify-end min-h-full">

            {isClient ? (
              <>
                <MessageWall
                  messages={messages}
                  status={status}
                  durations={durations}
                  onDurationChange={handleDurationChange}
                />

                {/* Typing Indicator */}
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-4 animate-spin" style={{ color: "#4A342E" }} />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* INPUT AREA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-3 pt-4 shadow-inner"
          style={{
            backgroundColor: "#FFFDF8",
            borderTop: "1px solid #CBBBA0",
          }}
        >
          <div className="w-full px-5 items-center flex justify-center">
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">
                          Message
                        </FieldLabel>

                        <div className="relative">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-14 pl-5 pr-16 rounded-xl text-base"
                            style={{
                              backgroundColor: "#F7F3EB",
                              borderColor: "#CBBBA0",
                              color: "#4A342E",
                            }}
                            placeholder="Type your legal query..."
                            disabled={status === "streaming"}
                            autoComplete="off"
                          />

                          {/* Send / Stop Buttons */}
                          {(status === "ready" || status === "error") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full"
                              type="submit"
                              size="icon"
                              disabled={!field.value.trim()}
                              style={{
                                backgroundColor: "#4A342E",
                                color: "white",
                              }}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}

                          {(status === "streaming" || status === "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              size="icon"
                              onClick={stop}
                              style={{
                                backgroundColor: "#D4AF37",
                                color: "#4A342E",
                              }}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full px-5 pt-3 text-center text-xs"
            style={{ color: "#6B5C50" }}
          >
            © {new Date().getFullYear()} {OWNER_NAME} ·  
            <Link href="/terms" className="underline ml-1">Terms</Link>  
            · Powered by  
            <Link href="https://ringel.ai/" className="underline ml-1">Ringel.AI</Link>
          </div>
        </div>

      </main>
    </div>
  );
}
