import { createBrowserRouter, type RouteObject } from "react-router";

import { NotFoundComponent, RootComponent, RootError } from "./RootLayout";
import { AuditLogs } from "@/pages/AuditLogs";
import { Calendar } from "@/pages/Calendar";
import { Cashdesk } from "@/pages/Cashdesk";
import { ClientDetail } from "@/pages/ClientDetail";
import { ClientBase } from "@/pages/Clients";
import { Dashboard } from "@/pages/Dashboard";
import { DogDetail } from "@/pages/DogDetail";
import { GroomerDetail } from "@/pages/GroomerDetail";
import { GroomersPage } from "@/pages/Groomers";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import { TemplatesPage } from "@/pages/Templates";

const title = (t: string) => ({ title: `${t} – CRM груминг-салона` });

const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootComponent />,
    errorElement: <RootError />,
    children: [
      {
        index: true,
        element: <Dashboard />,
        handle: { title: "Панель администратора – Daisy's pet grooming" },
      },
      { path: "kalendar", element: <Calendar />, handle: title("Календарь") },
      { path: "klienti", element: <ClientBase />, handle: title("Клиентская база") },
      { path: "klienti/:clientId", element: <ClientDetail />, handle: title("Карточка клиента") },
      { path: "groomeri", element: <GroomersPage />, handle: title("Грумеры") },
      {
        path: "groomeri/:groomerId",
        element: <GroomerDetail />,
        handle: title("Карточка грумера"),
      },
      { path: "psi/:dogId", element: <DogDetail />, handle: title("Карточка собаки") },
      { path: "reporty", element: <Reports />, handle: title("Отчёты") },
      { path: "kassa", element: <Cashdesk />, handle: title("Касса") },
      { path: "sablony", element: <TemplatesPage />, handle: title("Шаблоны сообщений") },
      { path: "logs", element: <AuditLogs />, handle: title("Журнал действий") },
      { path: "nastaveni", element: <Settings />, handle: title("Настройки") },
    ],
  },
  { path: "*", element: <NotFoundComponent /> },
];

// BASE_URL is "/groom-buddy/" on GitHub Pages, "/" elsewhere (see vite.config.ts).
export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
