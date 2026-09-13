import React, { Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
	XMarkIcon,
	Squares2X2Icon,
	CheckCircleIcon,
	ArrowDownTrayIcon,
	ArrowUpTrayIcon,
	SparklesIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useTasks } from "../context/useTasks.ts";
import { MAX_IMPORT_SIZE_BYTES } from "../utils/storage.ts";

interface SidebarProps {
	currentView: "dashboard" | "tasks";
	setCurrentView: (view: "dashboard" | "tasks") => void;
	isMobileMenuOpen: boolean;
	setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
	currentView,
	setCurrentView,
	isMobileMenuOpen,
	setIsMobileMenuOpen,
}) => {
	const { loadSampleTasks, exportTasks, importTasks, clearAllTasks, tasks } =
		useTasks();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const navigation = [
		{ name: "Dashboard", view: "dashboard" as const, icon: Squares2X2Icon },
		{ name: "Tasks", view: "tasks" as const, icon: CheckCircleIcon },
	];

	const handleSelectView = (view: "dashboard" | "tasks") => {
		setCurrentView(view);
		setIsMobileMenuOpen(false); // F07 fix: close drawer on selection
	};

	const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > MAX_IMPORT_SIZE_BYTES) {
			toast.error("File is too large (maximum allowed size is 2MB)");
			e.target.value = "";
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result;
			if (typeof content === "string") {
				importTasks(content);
			}
		};
		reader.onerror = () => {
			toast.error(
				"Failed to read the file. Please check file permissions and try again.",
			);
		};
		reader.onabort = () => {
			toast.error("File reading was aborted.");
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	const handleClearConfirm = () => {
		clearAllTasks();
	};

	const renderSidebarBody = () => (
		<div className="flex flex-col flex-grow pt-5 bg-gradient-to-b from-primary-800 to-primary-950 dark:from-secondary-900 dark:to-secondary-950 overflow-y-auto text-white">
			{/* Brand Header */}
			<div className="flex items-center flex-shrink-0 px-5 mb-6">
				<div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
					<CheckCircleIcon
						className="h-6 w-6 text-primary-300 dark:text-primary-400"
						aria-hidden="true"
					/>
				</div>
				<div className="ml-3">
					<h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
						Nextly
					</h1>
					<p className="text-[11px] text-primary-200/70 dark:text-secondary-400">
						Know what to do next.
					</p>
				</div>
			</div>

			{/* Main Navigation */}
			<div className="flex-grow flex flex-col px-3">
				<nav className="space-y-1">
					{navigation.map((item) => {
						const isActive = currentView === item.view;
						return (
							<button
								key={item.name}
								type="button"
								onClick={() => handleSelectView(item.view)}
								aria-current={isActive ? "page" : undefined}
								className={`
                  group flex items-center px-4 py-3 text-sm font-semibold rounded-xl w-full min-h-[44px]
                  transition-all duration-150 cursor-pointer
                  ${
						isActive
							? "bg-white text-primary-900 shadow-md font-bold"
							: "text-primary-100 dark:text-secondary-300 hover:bg-white/10 hover:text-white"
					}
                `}
							>
								<item.icon
									className={`mr-3 h-5 w-5 ${
										isActive
											? "text-primary-600"
											: "text-primary-200 dark:text-secondary-400"
									}`}
									aria-hidden="true"
								/>
								{item.name}
							</button>
						);
					})}
				</nav>

				{/* Workspace & Data Tools */}
				<div className="mt-8 pt-6 border-t border-white/10 dark:border-secondary-800 space-y-2">
					<p className="px-3 text-xs font-semibold text-primary-200/60 dark:text-secondary-400 uppercase tracking-wider">
						Workspace & Data
					</p>

					<button
						type="button"
						onClick={loadSampleTasks}
						className="w-full min-h-[44px] flex items-center px-3 py-2 text-xs font-medium text-primary-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
					>
						<SparklesIcon
							className="mr-2.5 h-4 w-4 text-amber-300"
							aria-hidden="true"
						/>
						Load Sample Workspace
					</button>

					<button
						type="button"
						onClick={exportTasks}
						className="w-full min-h-[44px] flex items-center px-3 py-2 text-xs font-medium text-primary-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
					>
						<ArrowDownTrayIcon
							className="mr-2.5 h-4 w-4 text-primary-300"
							aria-hidden="true"
						/>
						Export JSON Backup
					</button>

					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="w-full min-h-[44px] flex items-center px-3 py-2 text-xs font-medium text-primary-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
					>
						<ArrowUpTrayIcon
							className="mr-2.5 h-4 w-4 text-primary-300"
							aria-hidden="true"
						/>
						Import JSON
					</button>

					{tasks.length > 0 && (
						<button
							type="button"
							onClick={handleClearConfirm}
							className="w-full min-h-[44px] flex items-center px-3 py-2 text-xs font-medium text-red-200 hover:text-red-100 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
						>
							<TrashIcon
								className="mr-2.5 h-4 w-4 text-red-300"
								aria-hidden="true"
							/>
							Clear All Tasks
						</button>
					)}
				</div>
			</div>

			{/* Footer Info */}
			<div className="p-4 mt-auto">
				<div className="p-3 bg-white/5 dark:bg-secondary-800/40 rounded-xl border border-white/5 text-[11px] text-primary-200/80 dark:text-secondary-400">
					<p className="font-medium text-white/90">
						Local-first privacy
					</p>
					<p className="mt-0.5 leading-relaxed">
						Data is stored only in this browser. No external
						accounts or servers.
					</p>
				</div>
			</div>
		</div>
	);

	return (
		<>
			{/* Shared hidden file input for import (W01 fix: single persistent ref across desktop and mobile) */}
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleImportFile}
				accept=".json,application/json"
				className="hidden"
				aria-label="Upload task JSON file"
			/>

			{/* Desktop static sidebar */}
			<aside
				className="hidden md:flex md:flex-shrink-0"
				aria-label="Sidebar navigation"
			>
				<div className="flex flex-col w-64 border-r border-primary-950/20 dark:border-secondary-800">
					{renderSidebarBody()}
				</div>
			</aside>

			{/* Mobile drawer with accessibility */}
			<Transition.Root show={isMobileMenuOpen} as={Fragment}>
				<Dialog
					as="div"
					className="fixed inset-0 flex z-50 md:hidden"
					onClose={setIsMobileMenuOpen}
				>
					<Transition.Child
						as={Fragment}
						enter="transition-opacity ease-linear duration-250 motion-reduce:transition-none"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity ease-linear duration-250 motion-reduce:transition-none"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Dialog.Overlay className="fixed inset-0 bg-secondary-900/70 backdrop-blur-xs" />
					</Transition.Child>

					<Transition.Child
						as={Fragment}
						enter="transition ease-in-out duration-250 transform motion-reduce:transition-none motion-reduce:transform-none"
						enterFrom="-translate-x-full"
						enterTo="translate-x-0"
						leave="transition ease-in-out duration-250 transform motion-reduce:transition-none motion-reduce:transform-none"
						leaveFrom="translate-x-0"
						leaveTo="-translate-x-full"
					>
						<div className="relative flex-1 flex flex-col max-w-xs w-full bg-primary-900">
							<div className="absolute top-2 right-2 z-10">
								<button
									type="button"
									className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
									onClick={() => setIsMobileMenuOpen(false)}
									aria-label="Close navigation menu"
								>
									<XMarkIcon
										className="h-6 w-6 text-white"
										aria-hidden="true"
									/>
								</button>
							</div>

							{/* Accessible dialog title for screen readers */}
							<Dialog.Title className="sr-only">
								Navigation Menu
							</Dialog.Title>

							{renderSidebarBody()}
						</div>
					</Transition.Child>
					<div className="flex-shrink-0 w-14" aria-hidden="true" />
				</Dialog>
			</Transition.Root>
		</>
	);
};
